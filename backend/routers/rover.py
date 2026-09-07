import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from config import settings
from services.websocket_manager import ws_manager
from services.mqtt_service import mqtt_service

router = APIRouter(prefix="/api/rover", tags=["Rover"])

def get_or_create_rover(db: Session) -> models.Rover:
    rover = db.query(models.Rover).filter(models.Rover.rover_id == "ROVER_01").first()
    if not rover:
        rover = models.Rover(
            rover_id="ROVER_01",
            mode="MANUAL",
            battery=95.0,
            obstacle_distance=150.0,
            row_index=1,
            position_x=0.0,
            position_y=0.0,
            status="IDLE"
        )
        db.add(rover)
        db.commit()
        db.refresh(rover)
    return rover

@router.get("/status", response_model=schemas.RoverStatusResponse)
def get_rover_status(db: Session = Depends(get_db)):
    rover = get_or_create_rover(db)
    return schemas.RoverStatusResponse(
        rover_id=rover.rover_id,
        mode=rover.mode,
        battery=rover.battery,
        obstacle_distance=rover.obstacle_distance,
        row_index=rover.row_index,
        position_x=rover.position_x,
        position_y=rover.position_y,
        status=rover.status
    )

@router.post("/control")
async def control_rover(payload: schemas.RoverCommand, db: Session = Depends(get_db)):
    rover = get_or_create_rover(db)
    cmd = payload.command.upper()
    req_id = payload.request_id or f"REQ_{int(datetime.datetime.utcnow().timestamp()*1000)}"

    cmd_log = models.CommandLog(
        request_id=req_id,
        device_id=rover.rover_id,
        command=cmd,
        status="RECEIVED"
    )
    db.add(cmd_log)

    # Map command to exact firmware target command
    target_cmd = cmd
    if cmd in ["AUTO", "AUTO_MODE"]:
        target_cmd = "AUTO_MODE"
    elif cmd in ["MANUAL", "MANUAL_MODE"]:
        target_cmd = "MANUAL_MODE"
    elif cmd in ["REVERSE", "BACKWARD"]:
        target_cmd = "BACKWARD"
    elif cmd in ["RESET", "CLEAR_EMERGENCY", "RESET_EMERGENCY_STOP"]:
        target_cmd = "RESET_EMERGENCY_STOP"
    elif cmd in ["PUMP1", "TREAT_PUMP1"]:
        target_cmd = "TREAT_PUMP1"
    elif cmd in ["PUMP2", "TREAT_PUMP2"]:
        target_cmd = "TREAT_PUMP2"

    mqtt_cmd_dict = {
        "command": target_cmd,
        "request_id": req_id,
        "rover_id": "ROVER-ESP32-01"
    }
    if hasattr(payload, "duration_ms") and payload.duration_ms:
        mqtt_cmd_dict["duration_ms"] = payload.duration_ms

    # Handle Emergency Stop (highest priority)
    if cmd == "EMERGENCY_STOP":
        rover.mode = "EMERGENCY_STOP"
        rover.status = "EMERGENCY_STOP"
        cmd_log.status = "COMPLETED"
        db.commit()

        mqtt_service.publish_rover_command(mqtt_cmd_dict)
        
        alert = models.Alert(
            severity="CRITICAL",
            title="EMERGENCY STOP ACTIVATED",
            message="Emergency stop was manually triggered or initiated by collision risk.",
            category="ROVER"
        )
        db.add(alert)
        db.commit()

        await ws_manager.broadcast("ROVER_UPDATE", {
            "mode": rover.mode,
            "status": rover.status,
            "battery": rover.battery,
            "obstacle_distance": rover.obstacle_distance,
            "row_index": rover.row_index,
            "position_x": rover.position_x,
            "position_y": rover.position_y
        })
        return {"status": "SUCCESS", "message": "EMERGENCY STOP ACTIVATED. All systems halted.", "rover_mode": rover.mode}

    # If currently in EMERGENCY_STOP, require explicit RESET/CLEAR
    if rover.mode == "EMERGENCY_STOP" and target_cmd != "RESET_EMERGENCY_STOP":
        cmd_log.status = "REJECTED"
        db.commit()
        raise HTTPException(status_code=400, detail="Rover is in EMERGENCY_STOP. Send RESET command to clear.")

    if target_cmd == "RESET_EMERGENCY_STOP":
        rover.mode = "MANUAL"
        rover.status = "IDLE"
        cmd_log.status = "COMPLETED"
        db.commit()

        mqtt_service.publish_rover_command(mqtt_cmd_dict)

        await ws_manager.broadcast("ROVER_UPDATE", {
            "mode": rover.mode,
            "status": rover.status
        })
        return {"status": "SUCCESS", "message": "Emergency stop cleared. Rover returned to MANUAL mode.", "rover_mode": rover.mode}

    # Handle mode & movement updates
    if target_cmd == "AUTO_MODE":
        rover.mode = "AUTO"
        rover.status = "MOVING"
    elif target_cmd == "MANUAL_MODE":
        rover.mode = "MANUAL"
        rover.status = "IDLE"
    elif target_cmd in ["FORWARD", "BACKWARD", "LEFT", "RIGHT"]:
        rover.status = f"MOVING_{target_cmd}"
        if target_cmd == "FORWARD":
            rover.position_y += 0.5
        elif target_cmd == "BACKWARD":
            rover.position_y = max(0.0, rover.position_y - 0.5)
        elif target_cmd == "LEFT":
            rover.position_x -= 0.5
        elif target_cmd == "RIGHT":
            rover.position_x += 0.5
    elif target_cmd in ["STOP", "PAUSE"]:
        rover.status = "STOPPED" if target_cmd == "STOP" else "PAUSED"

    cmd_log.status = "COMPLETED"
    rover.updated_at = datetime.datetime.utcnow()
    db.commit()

    # Dispatch command to Rover ESP32 via MQTT
    mqtt_service.publish_rover_command(mqtt_cmd_dict)

    await ws_manager.broadcast("ROVER_UPDATE", {
        "mode": rover.mode,
        "status": rover.status,
        "battery": rover.battery,
        "obstacle_distance": rover.obstacle_distance,
        "row_index": rover.row_index,
        "position_x": rover.position_x,
        "position_y": rover.position_y
    })

    return {"status": "SUCCESS", "command": target_cmd, "rover_mode": rover.mode, "rover_status": rover.status}

@router.post("/telemetry")
async def update_telemetry(battery: float, obstacle_distance: float, row_index: int = 1, db: Session = Depends(get_db)):
    rover = get_or_create_rover(db)
    rover.battery = battery
    rover.obstacle_distance = obstacle_distance
    rover.row_index = row_index
    
    # Auto stop if obstacle is detected
    if obstacle_distance < settings.OBSTACLE_THRESHOLD_CM and rover.mode == "AUTO":
        rover.status = "OBSTACLE_DETECTED"
        rover.mode = "PAUSED"
        alert = models.Alert(
            severity="WARNING",
            title="OBSTACLE DETECTED",
            message=f"Obstacle detected at {obstacle_distance} cm. Rover paused.",
            category="ROVER"
        )
        db.add(alert)
        
    db.commit()
    
    await ws_manager.broadcast("ROVER_UPDATE", {
        "mode": rover.mode,
        "status": rover.status,
        "battery": rover.battery,
        "obstacle_distance": rover.obstacle_distance,
        "row_index": rover.row_index,
        "position_x": rover.position_x,
        "position_y": rover.position_y
    })
    return {"status": "SUCCESS"}

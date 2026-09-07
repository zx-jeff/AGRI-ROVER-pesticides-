import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List

import models
from database import get_db
from services.safety_engine import SafetyEngine
from services.websocket_manager import ws_manager
from services.mqtt_service import mqtt_service

logger = logging.getLogger("irrigation_router")

router = APIRouter(prefix="/api/irrigation", tags=["Smart Irrigation"])

class ManualIrrigationRequest(BaseModel):
    command: str = Field(..., description="ON or OFF")
    duration_sec: int = Field(10, description="Pump duration in seconds")

class AutoConfigPayload(BaseModel):
    cycles: int = Field(3, description="Number of irrigations (e.g. 3)")
    duration_sec: int = Field(10, description="Irrigation duration in seconds (e.g. 10)")
    threshold: float = Field(40.0, description="Soil moisture threshold percentage (e.g. 40.0)")
    mode: str = Field("AUTO", description="MANUAL or AUTO")
    is_active: bool = Field(True, description="Whether auto irrigation is active")

class IPConfigPayload(BaseModel):
    ip_address: str = Field(..., description="IP Address of NodeMCU ESP8266 (e.g. 192.168.1.102)")

@router.get("/status")
def get_irrigation_status(db: Session = Depends(get_db)):
    latest_sensor = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    if not latest_sensor:
        latest_sensor = models.SensorReading(temperature=28.5, humidity=62.0, soil_moisture=35.0, rain_detected=False)
        db.add(latest_sensor)
        db.commit()

    config = db.query(models.IrrigationAutoConfig).first()
    if not config:
        config = models.IrrigationAutoConfig(cycles=3, duration_sec=10, moisture_threshold=40.0, mode="MANUAL", is_active=False, ip_address="192.168.1.102")
        db.add(config)
        db.commit()
        db.refresh(config)

    latest_event = db.query(models.IrrigationEvent).order_by(models.IrrigationEvent.timestamp.desc()).first()

    return {
        "status": "OPERATIONAL",
        "mode": config.mode,
        "is_active": config.is_active,
        "cycles": config.cycles,
        "duration_sec": config.duration_sec,
        "moisture_threshold": config.moisture_threshold,
        "ip_address": getattr(config, "ip_address", "192.168.1.102"),
        "sensor": {
            "soil_moisture": latest_sensor.soil_moisture,
            "soil_raw": int((100.0 - latest_sensor.soil_moisture) * 10),
            "rain_detected": latest_sensor.rain_detected,
            "rain_raw": 0 if latest_sensor.rain_detected else 1,
            "temperature": latest_sensor.temperature,
            "humidity": latest_sensor.humidity,
            "pump": latest_event.status == "PUMP_ON" if latest_event else False
        },
        "last_event": latest_event
    }

@router.post("/ip-config")
async def update_irrigation_ip(payload: IPConfigPayload, db: Session = Depends(get_db)):
    """
    Saves & syncs NodeMCU ESP8266 IP address for web connectivity.
    """
    formatted_ip = payload.ip_address.strip()
    if formatted_ip and not formatted_ip.startswith("http://") and not formatted_ip.startswith("https://"):
        formatted_ip = f"http://{formatted_ip}"

    config = db.query(models.IrrigationAutoConfig).first()
    if not config:
        config = models.IrrigationAutoConfig()
        db.add(config)

    config.ip_address = formatted_ip
    db.commit()
    db.refresh(config)

    logger.info(f"NodeMCU ESP8266 IP Configured: {formatted_ip}")

    await ws_manager.broadcast("IRRIGATION_IP_UPDATE", {
        "ip_address": formatted_ip,
        "device_id": "IRRIGATION-NODEMCU-01"
    })

    return {
        "status": "SUCCESS",
        "ip_address": formatted_ip,
        "message": f"Connected & synced NodeMCU ESP8266 IP: {formatted_ip}"
    }

async def send_direct_http_command(ip_address: str, command_dict: dict):
    if not ip_address or not ip_address.strip():
        return
    formatted_ip = ip_address.strip()
    if not formatted_ip.startswith("http://") and not formatted_ip.startswith("https://"):
        formatted_ip = f"http://{formatted_ip}"

    base_url = formatted_ip.rstrip("/")
    import httpx
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            # 1. Try POST to /command, /api/pump, /pump with JSON body
            for path in ["/command", "/api/pump", "/pump"]:
                try:
                    await client.post(f"{base_url}{path}", json=command_dict)
                except Exception:
                    pass

            # 2. Try RESTful GET routes for NodeMCU web server compatibility
            cmd = command_dict.get("command") or command_dict.get("cmd")
            if cmd in ["IRRIGATE", "ON"]:
                dur = command_dict.get("duration_sec", 10)
                routes = [
                    f"/pump?state=ON&duration={dur}",
                    f"/pump?cmd=ON&duration={dur}",
                    f"/pump?relay=1",
                    "/pump/on",
                    "/relay/on",
                    "/on"
                ]
                for ep in routes:
                    try:
                        await client.get(f"{base_url}{ep}")
                    except Exception:
                        pass
            elif cmd in ["STOP_IRRIGATION", "OFF"]:
                routes = [
                    "/pump?state=OFF",
                    "/pump?cmd=OFF",
                    "/pump?relay=0",
                    "/pump/off",
                    "/relay/off",
                    "/off"
                ]
                for ep in routes:
                    try:
                        await client.get(f"{base_url}{ep}")
                    except Exception:
                        pass
            elif cmd in ["AUTO_IRRIGATE", "AUTO"]:
                cyc = command_dict.get("cycles", 3)
                dur = command_dict.get("duration_sec", 10)
                thresh = command_dict.get("threshold", 40.0)
                routes = [
                    f"/auto?cycles={cyc}&duration={dur}&threshold={thresh}",
                    f"/auto/start?cycles={cyc}&duration={dur}"
                ]
                for ep in routes:
                    try:
                        await client.get(f"{base_url}{ep}")
                    except Exception:
                        pass
    except Exception as e:
        logger.warning(f"Direct HTTP command dispatch to {base_url} failed: {e}")

@router.post("/manual")
async def manual_pump_control(payload: ManualIrrigationRequest, db: Session = Depends(get_db)):
    """
    Manual Mode Endpoint:
    ON -> Sends PUMP ON command to NodeMCU via MQTT & direct HTTP. Allows manual override unless rain is detected.
    OFF -> Stops pump immediately via MQTT & direct HTTP.
    """
    latest_sensor = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    rain_detected = latest_sensor.rain_detected if latest_sensor else False

    config = db.query(models.IrrigationAutoConfig).first()
    ip_address = config.ip_address if config else ""

    if payload.command.upper() == "ON":
        if rain_detected:
            status = "BLOCKED_BY_RAIN"
            reason = "Manual pump start blocked: Rain detected by rain sensor!"
            authorized = False
        else:
            status = "PUMP_ON"
            reason = f"Manual pump activated for {payload.duration_sec}s."
            authorized = True

        event = models.IrrigationEvent(
            zone_name="Main Field",
            trigger_type="MANUAL",
            status=status,
            duration_sec=payload.duration_sec
        )
        db.add(event)
        db.commit()

        if authorized:
            mqtt_cmd = {
                "command": "IRRIGATE",
                "cmd": "ON",
                "pump": "ON",
                "pump_state": "ON",
                "state": "ON",
                "action": "PUMP_ON",
                "relay": 1,
                "status": "ON",
                "duration_sec": payload.duration_sec,
                "duration_ms": payload.duration_sec * 1000
            }

            # Dispatch via MQTT & direct HTTP to NodeMCU IP
            mqtt_service.publish_irrigation_command(mqtt_cmd)
            await send_direct_http_command(ip_address, mqtt_cmd)

            alert = models.Alert(
                severity="INFO",
                title="WATER PUMP ACTIVATED",
                message=f"Manual irrigation started ({payload.duration_sec}s).",
                category="IRRIGATION"
            )
            db.add(alert)
            db.commit()
        else:
            alert = models.Alert(
                severity="WARNING",
                title="MANUAL PUMP BLOCKED BY RAIN",
                message=reason,
                category="SAFETY"
            )
            db.add(alert)
            db.commit()

        await ws_manager.broadcast("IRRIGATION_EVENT", {
            "command": "ON",
            "authorized": authorized,
            "reason": reason,
            "status": status,
            "duration_sec": payload.duration_sec
        })

        return {
            "status": status,
            "authorized": authorized,
            "reason": reason,
            "duration_sec": payload.duration_sec
        }

    else:
        # PUMP OFF
        mqtt_cmd = {
            "command": "STOP_IRRIGATION",
            "cmd": "OFF",
            "pump": "OFF",
            "pump_state": "OFF",
            "state": "OFF",
            "action": "PUMP_OFF",
            "relay": 0,
            "status": "OFF",
            "duration_sec": 0,
            "duration_ms": 0
        }
        mqtt_service.publish_irrigation_command(mqtt_cmd)
        await send_direct_http_command(ip_address, mqtt_cmd)

        event = models.IrrigationEvent(
            zone_name="Main Field",
            trigger_type="MANUAL",
            status="PUMP_OFF",
            duration_sec=0
        )
        db.add(event)
        db.commit()

        await ws_manager.broadcast("IRRIGATION_EVENT", {
            "command": "OFF",
            "authorized": True,
            "reason": "Water pump stopped manually.",
            "status": "PUMP_OFF",
            "duration_sec": 0
        })

        return {
            "status": "PUMP_OFF",
            "authorized": True,
            "reason": "Water pump stopped manually.",
            "duration_sec": 0
        }

@router.post("/auto-config")
async def update_auto_config(payload: AutoConfigPayload, db: Session = Depends(get_db)):
    """
    Configures Auto Mode settings and dispatches AUTO_IRRIGATE to NodeMCU via MQTT & HTTP.
    """
    config = db.query(models.IrrigationAutoConfig).first()
    if not config:
        config = models.IrrigationAutoConfig()
        db.add(config)

    config.cycles = payload.cycles
    config.duration_sec = payload.duration_sec
    config.moisture_threshold = payload.threshold
    config.mode = payload.mode
    config.is_active = payload.is_active
    db.commit()
    db.refresh(config)

    ip_address = config.ip_address

    latest_sensor = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    soil_moisture = latest_sensor.soil_moisture if latest_sensor else 35.0
    rain_detected = latest_sensor.rain_detected if latest_sensor else False

    authorized, reason = SafetyEngine.evaluate_irrigation_safety(
        soil_moisture=soil_moisture,
        rain_detected=rain_detected,
        threshold=payload.threshold
    )

    mqtt_cmd = {
        "command": "AUTO_IRRIGATE" if payload.is_active and payload.mode == "AUTO" else "STOP_IRRIGATION",
        "cmd": "AUTO" if payload.is_active and payload.mode == "AUTO" else "OFF",
        "mode": payload.mode,
        "is_active": payload.is_active,
        "cycles": payload.cycles,
        "duration_sec": payload.duration_sec,
        "duration_ms": payload.duration_sec * 1000,
        "threshold": payload.threshold,
        "moisture_threshold": payload.threshold
    }

    # Dispatch via MQTT and Direct HTTP to NodeMCU IP
    mqtt_service.publish_irrigation_command(mqtt_cmd)
    await send_direct_http_command(ip_address, mqtt_cmd)

    if payload.is_active and payload.mode == "AUTO":
        if authorized:
            alert = models.Alert(
                severity="INFO",
                title="AUTO IRRIGATION SCHEDULE STARTED",
                message=f"Configured {payload.cycles} irrigations x {payload.duration_sec}s. {reason}",
                category="IRRIGATION"
            )
            db.add(alert)
            db.commit()
        else:
            alert = models.Alert(
                severity="WARNING",
                title="AUTO IRRIGATION BLOCKED BY SAFETY",
                message=f"Auto mode active but irrigation blocked: {reason}",
                category="SAFETY"
            )
            db.add(alert)
            db.commit()

    await ws_manager.broadcast("IRRIGATION_CONFIG_UPDATE", {
        "mode": config.mode,
        "is_active": config.is_active,
        "cycles": config.cycles,
        "duration_sec": config.duration_sec,
        "moisture_threshold": config.moisture_threshold,
        "authorized": authorized,
        "reason": reason
    })

    return {
        "status": "SUCCESS",
        "config": {
            "mode": config.mode,
            "is_active": config.is_active,
            "cycles": config.cycles,
            "duration_sec": config.duration_sec,
            "moisture_threshold": config.moisture_threshold,
        },
        "authorized": authorized,
        "reason": reason
    }

@router.post("/telemetry")
async def receive_irrigation_telemetry(
    soil_moisture: float = Body(35.0),
    rain_detected: bool = Body(False),
    temperature: float = Body(28.5),
    humidity: float = Body(62.0),
    db: Session = Depends(get_db)
):
    """
    Receives NodeMCU sensor telemetry or hardware simulator updates.
    Enforces rain safety cut-off and soil threshold cutoff in AUTO mode.
    """
    sensor = models.SensorReading(
        temperature=temperature,
        humidity=humidity,
        soil_moisture=soil_moisture,
        rain_detected=rain_detected
    )
    db.add(sensor)
    db.commit()

    config = db.query(models.IrrigationAutoConfig).first()
    threshold = config.moisture_threshold if config else 40.0
    mode = config.mode if config else "MANUAL"
    is_active = config.is_active if config else False

    # Auto cut-off safety check:
    # 1. Rain detected ALWAYS triggers emergency pump stop
    # 2. Soil moisture >= threshold ONLY triggers pump stop in AUTO mode when active
    should_cutoff = False
    cutoff_reason = ""
    if rain_detected:
        should_cutoff = True
        cutoff_reason = "Rain detected during irrigation!"
    elif is_active and mode == "AUTO" and soil_moisture >= threshold:
        should_cutoff = True
        cutoff_reason = f"Soil moisture reached threshold ({soil_moisture:.1f}% >= {threshold:.1f}%)"

    if should_cutoff:
        latest_event = db.query(models.IrrigationEvent).order_by(models.IrrigationEvent.timestamp.desc()).first()
        if latest_event and latest_event.status == "PUMP_ON":
            mqtt_cmd = {
                "command": "STOP_IRRIGATION",
                "cmd": "OFF",
                "pump": "OFF",
                "pump_state": "OFF",
                "state": "OFF",
                "action": "PUMP_OFF",
                "relay": 0
            }
            mqtt_service.publish_irrigation_command(mqtt_cmd)
            if config and config.ip_address:
                await send_direct_http_command(config.ip_address, mqtt_cmd)

            event = models.IrrigationEvent(
                zone_name="Main Field",
                trigger_type="SAFETY_AUTO_CUTOFF",
                status="PUMP_OFF",
                duration_sec=0
            )
            db.add(event)

            alert = models.Alert(
                severity="WARNING",
                title="SAFETY AUTO CUT-OFF ENGAGED",
                message=f"NodeMCU pump turned OFF immediately: {cutoff_reason}",
                category="SAFETY"
            )
            db.add(alert)
            db.commit()

    await ws_manager.broadcast("IRRIGATION_TELEMETRY", {
        "device_id": "IRRIGATION-NODEMCU-01",
        "soil_moisture": soil_moisture,
        "rain_detected": rain_detected,
        "temperature": temperature,
        "humidity": humidity,
        "moisture_threshold": threshold
    })

    return {"status": "SUCCESS"}

@router.get("/events")
def get_irrigation_events(db: Session = Depends(get_db)):
    events = db.query(models.IrrigationEvent).order_by(models.IrrigationEvent.timestamp.desc()).limit(30).all()
    return events

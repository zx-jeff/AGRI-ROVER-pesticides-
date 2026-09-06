import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from services.safety_engine import SafetyEngine
from services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/irrigation", tags=["Smart Irrigation"])

@router.get("/status")
def get_irrigation_status(db: Session = Depends(get_db)):
    latest_event = db.query(models.IrrigationEvent).order_by(models.IrrigationEvent.timestamp.desc()).first()
    schedules_count = db.query(models.IrrigationSchedule).filter(models.IrrigationSchedule.enabled == True).count()
    return {
        "status": "IDLE" if not latest_event else latest_event.status,
        "active_schedules_count": schedules_count,
        "last_event": latest_event
    }

@router.get("/schedules")
def get_schedules(db: Session = Depends(get_db)):
    schedules = db.query(models.IrrigationSchedule).all()
    if not schedules:
        # Seed default schedules
        s1 = models.IrrigationSchedule(zone_name="North Field Zone 1", time_of_day="06:00", duration_min=10, min_soil_moisture=65.0, suppress_if_rain=True, enabled=True)
        s2 = models.IrrigationSchedule(zone_name="South Field Zone 2", time_of_day="18:00", duration_min=15, min_soil_moisture=70.0, suppress_if_rain=True, enabled=True)
        db.add(s1)
        db.add(s2)
        db.commit()
        schedules = db.query(models.IrrigationSchedule).all()
    return schedules

@router.post("/schedules")
def create_schedule(payload: schemas.IrrigationScheduleCreate, db: Session = Depends(get_db)):
    schedule = models.IrrigationSchedule(**payload.dict())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return {"status": "SUCCESS", "schedule": schedule}

@router.post("/trigger")
async def trigger_irrigation(payload: schemas.IrrigationTriggerRequest, db: Session = Depends(get_db)):
    """
    Triggers irrigation pump execution with mandatory safety checks (Rain & Soil Moisture).
    """
    # Fetch current environmental sensors
    latest_sensor = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    soil_moisture = latest_sensor.soil_moisture if latest_sensor else 45.0
    rain_detected = latest_sensor.rain_detected if latest_sensor else False

    # Fetch current rover mode
    rover = db.query(models.Rover).filter(models.Rover.rover_id == "ROVER_01").first()
    rover_mode = rover.mode if rover else "MANUAL"

    if not payload.override_safety:
        authorized, reason = SafetyEngine.evaluate_irrigation_safety(
            soil_moisture=soil_moisture,
            rain_detected=rain_detected,
            rover_mode=rover_mode,
            suppress_if_rain=True,
            min_soil_moisture=70.0
        )
    else:
        authorized = True
        reason = "AUTHORIZED: Manual Safety Override engaged."

    status = "COMPLETED" if authorized else ("BLOCKED_BY_RAIN" if rain_detected else "BLOCKED_BY_MOISTURE")

    event = models.IrrigationEvent(
        zone_name=payload.zone_name,
        trigger_type="MANUAL",
        status=status,
        duration_sec=payload.duration_sec
    )
    db.add(event)
    db.commit()

    if authorized:
        alert = models.Alert(
            severity="INFO",
            title="IRRIGATION ACTIVATED",
            message=f"Irrigation started for {payload.zone_name} ({payload.duration_sec}s).",
            category="IRRIGATION"
        )
        db.add(alert)
        db.commit()
    else:
        alert = models.Alert(
            severity="WARNING",
            title="IRRIGATION BLOCKED BY SAFETY",
            message=f"Irrigation attempt for {payload.zone_name} blocked: {reason}",
            category="SAFETY"
        )
        db.add(alert)
        db.commit()

    await ws_manager.broadcast("IRRIGATION_EVENT", {
        "zone_name": payload.zone_name,
        "authorized": authorized,
        "reason": reason,
        "status": status,
        "duration_sec": payload.duration_sec
    })

    return {
        "authorized": authorized,
        "status": status,
        "reason": reason,
        "duration_sec": payload.duration_sec
    }

@router.get("/events")
def get_irrigation_events(db: Session = Depends(get_db)):
    events = db.query(models.IrrigationEvent).order_by(models.IrrigationEvent.timestamp.desc()).limit(30).all()
    return events

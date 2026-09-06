import datetime
import random
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/environment", tags=["Environmental Sensors"])

@router.get("/telemetry")
def get_latest_telemetry(db: Session = Depends(get_db)):
    reading = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    if not reading:
        # Seed initial sensor reading
        reading = models.SensorReading(
            temperature=27.5,
            humidity=62.0,
            soil_moisture=48.0,
            rain_detected=False
        )
        db.add(reading)
        db.commit()
        db.refresh(reading)
    return reading

@router.post("/telemetry")
async def post_telemetry(payload: schemas.TelemetryPayload, db: Session = Depends(get_db)):
    reading = models.SensorReading(
        temperature=payload.temperature,
        humidity=payload.humidity,
        soil_moisture=payload.soil_moisture,
        rain_detected=payload.rain_detected
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    await ws_manager.broadcast("SENSOR_UPDATE", {
        "temperature": reading.temperature,
        "humidity": reading.humidity,
        "soil_moisture": reading.soil_moisture,
        "rain_detected": reading.rain_detected,
        "timestamp": reading.timestamp.isoformat()
    })
    return {"status": "SUCCESS", "id": reading.id}

@router.get("/history")
def get_sensor_history(hours: int = 24, db: Session = Depends(get_db)):
    readings = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).limit(100).all()
    if len(readings) < 10:
        # Generate rich historical trend data for initial visualization
        now = datetime.datetime.utcnow()
        mock_data = []
        for i in range(24):
            t = now - datetime.timedelta(hours=23 - i)
            sr = models.SensorReading(
                temperature=round(22.0 + random.uniform(0, 10.0), 1),
                humidity=round(50.0 + random.uniform(0, 25.0), 1),
                soil_moisture=round(40.0 + random.uniform(0, 30.0), 1),
                rain_detected=(i in [12, 13]),
                timestamp=t
            )
            db.add(sr)
            mock_data.append(sr)
        db.commit()
        readings = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.asc()).all()
        return readings
    return list(reversed(readings))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Notifications"])

@router.get("/")
def get_alerts(resolved: bool = False, db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).filter(models.Alert.resolved == resolved).order_by(models.Alert.timestamp.desc()).limit(50).all()
    if not alerts and not resolved:
        # Seed initial system alerts for demo
        a1 = models.Alert(
            severity="INFO",
            title="ROVER ONLINE",
            message="Rover ESP32 connected to MQTT broker successfully.",
            category="ROVER"
        )
        a2 = models.Alert(
            severity="WARNING",
            title="LOW SOIL MOISTURE",
            message="North Field soil moisture dropped to 42%. Scheduled irrigation pending.",
            category="IRRIGATION"
        )
        db.add(a1)
        db.add(a2)
        db.commit()
        alerts = db.query(models.Alert).filter(models.Alert.resolved == False).all()
    return alerts

@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    db.commit()
    return {"status": "SUCCESS", "alert_id": alert_id}

@router.get("/logs")
def get_system_logs(db: Session = Depends(get_db)):
    cmd_logs = db.query(models.CommandLog).order_by(models.CommandLog.timestamp.desc()).limit(50).all()
    return cmd_logs

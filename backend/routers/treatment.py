from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import get_db

router = APIRouter(prefix="/api/treatment", tags=["Treatment Configuration"])

@router.get("/config")
def get_treatment_configs(db: Session = Depends(get_db)):
    configs = db.query(models.TreatmentConfig).all()
    if not configs:
        # Seed initial mappings as per SRS FR-12 & Acceptance Criteria:
        # Disease 1 -> Tank 1/Pump 1, Disease 2 -> Tank 2/Pump 2
        defaults = [
            models.TreatmentConfig(disease_name="DISEASE_1", tank_id="Tank 1", pump_id="Pump 1", duration_sec=3.0, enabled=True),
            models.TreatmentConfig(disease_name="DISEASE_2", tank_id="Tank 2", pump_id="Pump 2", duration_sec=4.0, enabled=True),
        ]
        for d in defaults:
            db.add(d)
        db.commit()
        configs = db.query(models.TreatmentConfig).all()
    return configs

@router.post("/config")
def save_treatment_config(payload: schemas.TreatmentConfigSchema, db: Session = Depends(get_db)):
    config = db.query(models.TreatmentConfig).filter(
        models.TreatmentConfig.disease_name == payload.disease_name
    ).first()
    
    if not config:
        config = models.TreatmentConfig(disease_name=payload.disease_name)
        db.add(config)
        
    config.tank_id = payload.tank_id
    config.pump_id = payload.pump_id
    config.duration_sec = payload.duration_sec
    config.enabled = payload.enabled
    db.commit()
    db.refresh(config)
    return {"status": "SUCCESS", "config": config}

@router.get("/history")
def get_treatment_history(db: Session = Depends(get_db)):
    treatments = db.query(models.Treatment).order_by(models.Treatment.executed_at.desc()).limit(30).all()
    return treatments

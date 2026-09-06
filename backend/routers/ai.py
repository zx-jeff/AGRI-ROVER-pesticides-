import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import base64
import models, schemas
from database import get_db
from services.ai_service import analyze_plant_image
from services.safety_engine import SafetyEngine
from services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/ai", tags=["AI Plant Analysis"])

@router.post("/upload-and-analyze")
async def upload_and_analyze(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    gemini_api_key: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    ESP32-CAM upload or Dashboard web upload endpoint for AI plant image diagnosis.
    Enforces SRS FR-08, FR-09, FR-10, FR-11, FR-12, FR-13 safety policies.
    """
    raw_b64 = None
    if file:
        content = await file.read()
        raw_b64 = base64.b64encode(content).decode('utf-8')
    elif image_base64:
        raw_b64 = image_base64
    else:
        # If no image uploaded, generate placeholder synthetic test sample
        raw_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    code = f"INSP_{uuid.uuid4().hex[:8].upper()}"
    inspection = models.PlantInspection(
        inspection_code=code,
        image_base64=raw_b64,
        status="ANALYZING"
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)

    # Call Gemini / Vision AI Service with real leaf analysis
    ai_result = analyze_plant_image(image_base64=raw_b64, api_key=gemini_api_key)
    disease = ai_result["disease"]
    confidence = ai_result["confidence"]
    description = ai_result["description"]
    recommended_action = ai_result["recommended_action"]

    # Record AI Analysis DB record
    ai_record = models.AIAnalysis(
        inspection_id=inspection.id,
        raw_response=ai_result.get("raw_response", ""),
        disease_detected=disease,
        confidence_score=confidence,
        recommended_action=recommended_action
    )
    db.add(ai_record)

    # Get Rover status for safety check
    rover = db.query(models.Rover).filter(models.Rover.rover_id == "ROVER_01").first()
    rover_mode = rover.mode if rover else "MANUAL"
    obstacle_dist = rover.obstacle_distance if rover else 150.0

    # Evaluate Safety Policy Engine
    authorized, safety_reason, tank_id, pump_id, spray_duration = SafetyEngine.evaluate_treatment_safety(
        db=db,
        disease=disease,
        confidence=confidence,
        rover_mode=rover_mode,
        obstacle_distance=obstacle_dist
    )

    # Update Inspection Record
    inspection.status = "COMPLETED"
    inspection.disease = disease
    inspection.confidence = confidence
    inspection.treatment_decision = "AUTHORIZED" if authorized else "NO_SPRAY"
    inspection.tank_used = tank_id if authorized else None
    inspection.pump_used = pump_id if authorized else None
    inspection.spray_duration = spray_duration if authorized else 0.0
    db.commit()

    # If authorized, log treatment record
    if authorized:
        treatment = models.Treatment(
            inspection_id=inspection.id,
            disease_name=disease,
            tank_id=tank_id,
            pump_id=pump_id,
            duration_sec=spray_duration,
            status="SUCCESS"
        )
        db.add(treatment)
        db.commit()

        # Log alert for treatment applied
        alert = models.Alert(
            severity="INFO",
            title="TARGETED TREATMENT EXECUTED",
            message=f"Applied {tank_id} / {pump_id} for {disease} ({spray_duration}s).",
            category="AI"
        )
        db.add(alert)
        db.commit()

    elif disease in ["DISEASE_1", "DISEASE_2"]:
        # Log safety blocked alert
        alert = models.Alert(
            severity="WARNING",
            title="TREATMENT BLOCKED BY SAFETY POLICY",
            message=f"Disease {disease} detected but treatment blocked: {safety_reason}",
            category="SAFETY"
        )
        db.add(alert)
        db.commit()

    # Broadcast via WebSocket
    await ws_manager.broadcast("AI_ANALYSIS_COMPLETE", {
        "inspection_code": code,
        "disease": disease,
        "confidence": confidence,
        "description": description,
        "recommended_action": recommended_action,
        "treatment_authorized": authorized,
        "safety_message": safety_reason,
        "tank_used": tank_id,
        "pump_used": pump_id,
        "spray_duration": spray_duration
    })

    return {
        "inspection_id": inspection.id,
        "inspection_code": code,
        "disease": disease,
        "confidence": confidence,
        "description": description,
        "recommended_action": recommended_action,
        "treatment_authorized": authorized,
        "tank_used": tank_id,
        "pump_used": pump_id,
        "spray_duration": spray_duration,
        "safety_message": safety_reason,
        "ai_source": ai_result.get("ai_source", "Vision System")
    }

@router.get("/history")
def get_inspection_history(limit: int = 20, db: Session = Depends(get_db)):
    inspections = db.query(models.PlantInspection).order_by(models.PlantInspection.timestamp.desc()).limit(limit).all()
    return inspections

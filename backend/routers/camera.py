import time
import base64
import uuid
import logging
from fastapi import APIRouter, Response, Request, Header, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
from database import get_db
from services.ai_service import analyze_plant_image
from services.safety_engine import SafetyEngine
from services.websocket_manager import ws_manager

logger = logging.getLogger("camera_router")

router = APIRouter(tags=["Camera Stream & ESP32-CAM Endpoint"])

# Continuous multipart MJPEG generator
MOCK_STREAM_FRAME_1 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")

def generate_mock_mjpeg_stream():
    """Generates continuous multipart MJPEG stream for human visual monitoring."""
    while True:
        frame = MOCK_STREAM_FRAME_1
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        time.sleep(0.05)

import os

# Sample high quality plant leaf snapshot for demo/fallback capture
SAMPLE_LEAF_PATH = os.path.join(os.path.dirname(__file__), "..", "sample_leaf.b64")
if os.path.exists(SAMPLE_LEAF_PATH):
    with open(SAMPLE_LEAF_PATH, "r") as f:
        MOCK_LEAF_SNAPSHOT = base64.b64decode(f.read().strip())
else:
    MOCK_LEAF_SNAPSHOT = base64.b64decode(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAHgAoMBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    )

@router.get("/api/camera/stream")
def get_live_mjpeg_stream():
    """Continuous MJPEG stream for frontend live viewer."""
    return StreamingResponse(
        generate_mock_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/api/camera/snapshot")
def get_camera_snapshot():
    """Returns single JPEG snapshot frame from demo stream."""
    return Response(content=MOCK_LEAF_SNAPSHOT, media_type="image/jpeg")

@router.get("/api/camera/proxy-stream")
async def proxy_esp32_cam_stream(url: str):
    """
    Proxies live MJPEG stream from physical ESP32-CAM IP to bypass browser CORS / Private Network Access limits.
    Example: GET /api/camera/proxy-stream?url=http://192.168.1.100/stream
    """
    import urllib.request
    def stream_generator():
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'AgriRover-Backend'})
            with urllib.request.urlopen(req, timeout=10) as stream:
                while True:
                    chunk = stream.read(4096)
                    if not chunk:
                        break
                    yield chunk
        except Exception as e:
            logger.warning(f"Stream proxy failed for {url}: {e}")
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + MOCK_LEAF_SNAPSHOT + b'\r\n')

    return StreamingResponse(
        stream_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/api/camera/proxy-capture")
async def proxy_esp32_cam_capture(url: str):
    """
    Proxies JPEG frame capture from physical ESP32-CAM IP to bypass browser CORS restrictions.
    Example: GET /api/camera/proxy-capture?url=http://192.168.1.100/capture
    """
    import urllib.request
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'AgriRover-Backend'})
        with urllib.request.urlopen(req, timeout=4) as response:
            image_data = response.read()
            return Response(content=image_data, media_type="image/jpeg")
    except Exception as e:
        logger.warning(f"Proxy capture failed for {url}: {e}. Returning fallback snapshot.")
        return Response(content=MOCK_LEAF_SNAPSHOT, media_type="image/jpeg")

@router.get("/api/camera/status")
def get_camera_status():
    return {
        "status": "ONLINE",
        "fps": 20,
        "resolution": "VGA (640x480)",
        "signal_quality": "94%",
        "stream_url": "/api/camera/stream",
        "snapshot_url": "/api/camera/snapshot"
    }

@router.post("/api/upload-image")
async def handle_esp32_cam_upload(
    request: Request,
    x_device_id: str = Header(None, alias="X-Device-ID"),
    x_crop: str = Header(None, alias="X-Crop"),
    db: Session = Depends(get_db)
):
    """
    HTTP POST Endpoint directly invoked by ESP32-CAM `uploadImage()` method in firmware.
    Receives raw JPEG body, converts to base64, runs Gemini Vision AI analysis & safety logic,
    and returns exact JSON response expected by ESP32-CAM (`{"status": "UPLOADED", "message": "..."}`).
    """
    try:
        raw_bytes = await request.body()
        if not raw_bytes:
            raise HTTPException(status_code=400, detail="Empty JPEG image body received")

        raw_b64 = base64.b64encode(raw_bytes).decode('utf-8')
        code = f"CAM_{uuid.uuid4().hex[:8].upper()}"

        inspection = models.PlantInspection(
            inspection_code=code,
            image_base64=raw_b64,
            status="ANALYZING"
        )
        db.add(inspection)
        db.commit()
        db.refresh(inspection)

        # Run Gemini Vision AI Analysis
        ai_result = analyze_plant_image(image_bytes=raw_bytes)
        disease = ai_result.get("disease", "UNKNOWN")
        confidence = ai_result.get("confidence", 0.0)
        description = ai_result.get("description", "Image analyzed from ESP32-CAM upload")
        recommended_action = ai_result.get("recommended_action", "MANUAL_INSPECTION")

        # Evaluate Safety Policy Engine
        rover = db.query(models.Rover).filter(models.Rover.rover_id == "ROVER-ESP32-01").first()
        rover_mode = rover.mode if rover else "MANUAL"
        obstacle_dist = rover.obstacle_distance if rover else 150.0

        authorized, safety_reason, tank_id, pump_id, spray_duration = SafetyEngine.evaluate_treatment_safety(
            db=db,
            disease=disease,
            confidence=confidence,
            rover_mode=rover_mode,
            obstacle_distance=obstacle_dist
        )

        inspection.status = "COMPLETED"
        inspection.disease = disease
        inspection.confidence = confidence
        inspection.treatment_decision = "AUTHORIZED" if authorized else "NO_SPRAY"
        inspection.tank_used = tank_id if authorized else None
        inspection.pump_used = pump_id if authorized else None
        inspection.spray_duration = spray_duration if authorized else 0.0
        db.commit()

        # Broadcast update via WebSocket
        await ws_manager.broadcast("AI_ANALYSIS_COMPLETE", {
            "device_id": x_device_id or "ESP32-CAM-ROVER-01",
            "crop": x_crop or "Tomato",
            "inspection_code": code,
            "disease": disease,
            "confidence": confidence,
            "description": description,
            "treatment_authorized": authorized,
            "safety_message": safety_reason,
            "tank_used": tank_id,
            "pump_used": pump_id,
            "spray_duration": spray_duration
        })

        logger.info(f"ESP32-CAM Image Upload Processed: {code} - Disease: {disease} ({confidence*100:.1f}%)")

        return {
            "status": "UPLOADED",
            "message": "Image processed & analyzed by Gemini Vision AI",
            "inspection_code": code,
            "disease": disease,
            "confidence": confidence,
            "treatment_authorized": authorized,
            "safety_message": safety_reason
        }
    except Exception as e:
        logger.error(f"Failed to process ESP32-CAM image upload: {e}")
        return {
            "status": "ERROR",
            "message": f"Processing exception: {str(e)}"
        }

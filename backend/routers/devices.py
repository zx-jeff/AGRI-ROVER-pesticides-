import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/devices", tags=["Device Capabilities"])

MANIFEST_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "firmware-manifest.json")

@router.get("/")
def get_device_manifest():
    """
    Returns the real firmware capability discovery manifest.
    Dynamically describes all detected hardware devices, sensors, actuators, MQTT topics, and HTTP endpoints.
    """
    if not os.path.exists(MANIFEST_PATH):
        raise HTTPException(status_code=404, detail="Firmware manifest not found")
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        return manifest
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read firmware manifest: {str(e)}")

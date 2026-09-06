import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
from database import engine, get_db
from config import settings
from services.websocket_manager import ws_manager

# Routers
from routers import rover, ai, treatment, irrigation, sensors, alerts, camera, devices
from services.mqtt_service import mqtt_service

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart_farm_app")

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for AI-Powered Smart Farming Assistant with Autonomous Crop Monitoring Rover"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(rover.router)
app.include_router(ai.router)
app.include_router(treatment.router)
app.include_router(irrigation.router)
app.include_router(sensors.router)
app.include_router(alerts.router)
app.include_router(camera.router)
app.include_router(devices.router)

@app.on_event("startup")
def startup_event():
    logger.info("Initializing HiveMQ MQTT Service...")
    mqtt_service.start()

@app.on_event("shutdown")
def shutdown_event():
    logger.info("Stopping MQTT Service...")
    mqtt_service.stop()


@app.get("/")
def read_root():
    return {
        "status": "ONLINE",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.get("/api/dashboard/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Combined Dashboard overview endpoint returning system status, rover state,
    latest sensors, latest AI inspection, irrigation status, and unread alerts.
    """
    # 1. Rover status
    rov = rover.get_or_create_rover(db)
    
    # 2. Sensors
    sensor = db.query(models.SensorReading).order_by(models.SensorReading.timestamp.desc()).first()
    if not sensor:
        sensor = models.SensorReading(temperature=26.5, humidity=60.0, soil_moisture=52.0, rain_detected=False)
        db.add(sensor)
        db.commit()

    # 3. Latest plant inspection
    latest_inspection = db.query(models.PlantInspection).order_by(models.PlantInspection.timestamp.desc()).first()

    # 4. Active alerts count
    unread_alerts_count = db.query(models.Alert).filter(models.Alert.resolved == False).count()

    # 5. Treatment config status
    treatments_count = db.query(models.Treatment).count()

    return {
        "system_status": "OPERATIONAL" if rov.mode != "EMERGENCY_STOP" else "EMERGENCY_STOP",
        "rover": {
            "rover_id": rov.rover_id,
            "mode": rov.mode,
            "status": rov.status,
            "battery": rov.battery,
            "obstacle_distance": rov.obstacle_distance,
            "row_index": rov.row_index,
            "position_x": rov.position_x,
            "position_y": rov.position_y
        },
        "environment": {
            "temperature": sensor.temperature,
            "humidity": sensor.humidity,
            "soil_moisture": sensor.soil_moisture,
            "rain_detected": sensor.rain_detected,
            "timestamp": sensor.timestamp
        },
        "latest_ai_analysis": {
            "inspection_code": latest_inspection.inspection_code if latest_inspection else None,
            "disease": latest_inspection.disease if latest_inspection else "N/A",
            "confidence": latest_inspection.confidence if latest_inspection else 0.0,
            "treatment_decision": latest_inspection.treatment_decision if latest_inspection else "NO_SPRAY",
            "timestamp": latest_inspection.timestamp if latest_inspection else None
        },
        "alerts_count": unread_alerts_count,
        "treatments_executed_count": treatments_count
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received WS ping: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

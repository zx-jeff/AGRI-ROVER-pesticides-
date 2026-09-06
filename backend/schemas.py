from pydantic import BaseModel, Field
from typing import Optional, List
import datetime

# Rover Schemas
class RoverCommand(BaseModel):
    command: str = Field(..., description="FORWARD, REVERSE, LEFT, RIGHT, STOP, PAUSE, RESUME, AUTO, EMERGENCY_STOP")
    request_id: Optional[str] = None

class RoverStatusResponse(BaseModel):
    rover_id: str
    mode: str
    battery: float
    obstacle_distance: float
    row_index: int
    position_x: float
    position_y: float
    status: str

# Plant Inspection Schemas
class InspectionCreate(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None

class AIAnalysisResult(BaseModel):
    inspection_id: int
    disease: str  # HEALTHY, DISEASE_1, DISEASE_2, UNKNOWN
    confidence: float
    description: str
    recommended_action: str
    treatment_authorized: bool
    tank_used: Optional[str] = None
    pump_used: Optional[str] = None
    spray_duration: float = 0.0
    safety_message: str

# Treatment Config Schemas
class TreatmentConfigSchema(BaseModel):
    disease_name: str
    tank_id: str
    pump_id: str
    duration_sec: float
    enabled: bool

# Irrigation Schemas
class IrrigationScheduleCreate(BaseModel):
    zone_name: str
    time_of_day: str
    duration_min: int = 10
    min_soil_moisture: float = 70.0
    suppress_if_rain: bool = True
    enabled: bool = True

class IrrigationTriggerRequest(BaseModel):
    zone_name: str
    duration_sec: int = 30
    override_safety: bool = False

# Sensor Telemetry Schemas
class TelemetryPayload(BaseModel):
    temperature: float
    humidity: float
    soil_moisture: float
    rain_detected: bool

# Alert Schema
class AlertResponse(BaseModel):
    id: int
    severity: str
    title: str
    message: str
    category: str
    timestamp: datetime.datetime
    resolved: bool

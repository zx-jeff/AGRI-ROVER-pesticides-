import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    role = Column(String, default="Farmer")  # Farmer, Admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True)
    device_type = Column(String)  # rover, camera, irrigation
    status = Column(String, default="online")  # online, offline, error
    battery_level = Column(Float, default=100.0)
    last_heartbeat = Column(DateTime, default=datetime.datetime.utcnow)

class Rover(Base):
    __tablename__ = "rovers"

    id = Column(Integer, primary_key=True, index=True)
    rover_id = Column(String, unique=True, index=True)
    mode = Column(String, default="MANUAL")  # MANUAL, AUTO, PAUSED, EMERGENCY_STOP
    battery = Column(Float, default=95.0)
    obstacle_distance = Column(Float, default=150.0)
    row_index = Column(Integer, default=1)
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)
    status = Column(String, default="IDLE")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class PlantInspection(Base):
    __tablename__ = "plant_inspections"

    id = Column(Integer, primary_key=True, index=True)
    inspection_code = Column(String, unique=True, index=True)
    image_url = Column(String, nullable=True)
    image_base64 = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="PENDING")  # PENDING, ANALYZING, COMPLETED, FAILED
    disease = Column(String, default="UNKNOWN")  # HEALTHY, DISEASE_1, DISEASE_2, UNKNOWN
    confidence = Column(Float, default=0.0)
    treatment_decision = Column(String, default="NO_SPRAY")
    tank_used = Column(String, nullable=True)
    pump_used = Column(String, nullable=True)
    spray_duration = Column(Float, default=0.0)

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("plant_inspections.id"))
    raw_response = Column(Text)
    disease_detected = Column(String)
    confidence_score = Column(Float)
    recommended_action = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class TreatmentConfig(Base):
    __tablename__ = "treatment_configs"

    id = Column(Integer, primary_key=True, index=True)
    disease_name = Column(String, unique=True, index=True)  # e.g., DISEASE_1, DISEASE_2
    tank_id = Column(String)  # Tank 1, Tank 2
    pump_id = Column(String)  # Pump 1, Pump 2
    duration_sec = Column(Float, default=3.0)
    enabled = Column(Boolean, default=True)

class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("plant_inspections.id"), nullable=True)
    disease_name = Column(String)
    tank_id = Column(String)
    pump_id = Column(String)
    duration_sec = Column(Float)
    status = Column(String, default="SUCCESS")  # SUCCESS, CANCELLED_BY_SAFETY, FAILED
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    temperature = Column(Float)
    humidity = Column(Float)
    soil_moisture = Column(Float)
    rain_detected = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class IrrigationSchedule(Base):
    __tablename__ = "irrigation_schedules"

    id = Column(Integer, primary_key=True, index=True)
    zone_name = Column(String)
    time_of_day = Column(String)  # e.g., "06:00", "18:00"
    duration_min = Column(Integer, default=10)
    min_soil_moisture = Column(Float, default=70.0)
    suppress_if_rain = Column(Boolean, default=True)
    enabled = Column(Boolean, default=True)

class IrrigationEvent(Base):
    __tablename__ = "irrigation_events"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("irrigation_schedules.id"), nullable=True)
    zone_name = Column(String)
    trigger_type = Column(String, default="SCHEDULED")  # SCHEDULED, MANUAL
    status = Column(String)  # COMPLETED, BLOCKED_BY_RAIN, BLOCKED_BY_MOISTURE, EMERGENCY_CANCELLED
    duration_sec = Column(Integer, default=60)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    severity = Column(String)  # INFO, WARNING, CRITICAL
    title = Column(String)
    message = Column(String)
    category = Column(String)  # ROVER, CAMERA, AI, IRRIGATION, SAFETY
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    resolved = Column(Boolean, default=False)

class CommandLog(Base):
    __tablename__ = "command_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String, index=True)
    device_id = Column(String)
    command = Column(String)
    status = Column(String)  # RECEIVED, EXECUTING, COMPLETED, REJECTED
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

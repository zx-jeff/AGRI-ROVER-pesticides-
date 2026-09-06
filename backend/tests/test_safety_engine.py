import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from database import Base
from services.safety_engine import SafetyEngine

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_emergency_stop_blocks_treatment(db_session):
    authorized, reason, tank, pump, duration = SafetyEngine.evaluate_treatment_safety(
        db=db_session,
        disease="DISEASE_1",
        confidence=0.95,
        rover_mode="EMERGENCY_STOP",
        obstacle_distance=150.0
    )
    assert authorized is False
    assert "EMERGENCY_STOP" in reason
    assert duration == 0.0

def test_obstacle_blocks_treatment(db_session):
    authorized, reason, tank, pump, duration = SafetyEngine.evaluate_treatment_safety(
        db=db_session,
        disease="DISEASE_1",
        confidence=0.95,
        rover_mode="MANUAL",
        obstacle_distance=10.0  # < 20 cm threshold
    )
    assert authorized is False
    assert "obstacle" in reason.lower()

def test_healthy_plant_no_spray(db_session):
    authorized, reason, tank, pump, duration = SafetyEngine.evaluate_treatment_safety(
        db=db_session,
        disease="HEALTHY",
        confidence=0.98,
        rover_mode="MANUAL",
        obstacle_distance=150.0
    )
    assert authorized is False
    assert "NO SPRAY" in reason

def test_unknown_disease_fail_closed(db_session):
    authorized, reason, tank, pump, duration = SafetyEngine.evaluate_treatment_safety(
        db=db_session,
        disease="UNKNOWN",
        confidence=0.40,
        rover_mode="MANUAL",
        obstacle_distance=150.0
    )
    assert authorized is False
    assert "Fail-closed" in reason or "NO SPRAY" in reason

def test_valid_disease1_treatment_authorized(db_session):
    authorized, reason, tank, pump, duration = SafetyEngine.evaluate_treatment_safety(
        db=db_session,
        disease="DISEASE_1",
        confidence=0.90,
        rover_mode="MANUAL",
        obstacle_distance=150.0
    )
    assert authorized is True
    assert tank == "Tank 1"
    assert pump == "Pump 1"
    assert duration > 0.0

def test_irrigation_rain_suppression():
    authorized, reason = SafetyEngine.evaluate_irrigation_safety(
        soil_moisture=40.0,
        rain_detected=True,
        rover_mode="MANUAL"
    )
    assert authorized is False
    assert "Rain sensor" in reason

def test_irrigation_high_soil_moisture_suppression():
    authorized, reason = SafetyEngine.evaluate_irrigation_safety(
        soil_moisture=78.0,  # > 70%
        rain_detected=False,
        rover_mode="MANUAL"
    )
    assert authorized is False
    assert "Soil moisture" in reason

from sqlalchemy.orm import Session
import models
from config import settings

class SafetyEngine:
    @staticmethod
    def evaluate_treatment_safety(
        db: Session,
        disease: str,
        confidence: float,
        rover_mode: str,
        obstacle_distance: float
    ) -> tuple[bool, str, str, str, float]:
        """
        Evaluates treatment safety rules according to SRS FR-10, FR-11, FR-12, FR-13, FR-15:
        Returns: (authorized: bool, reason: str, tank_id: str, pump_id: str, duration: float)
        """
        # Rule 1: Emergency Stop active
        if rover_mode == "EMERGENCY_STOP":
            return False, "BLOCKED: System is in EMERGENCY_STOP state.", "", "", 0.0

        # Rule 2: Critical Obstacle
        if obstacle_distance < settings.OBSTACLE_THRESHOLD_CM:
            return False, f"BLOCKED: Critical obstacle detected ({obstacle_distance} cm < {settings.OBSTACLE_THRESHOLD_CM} cm).", "", "", 0.0

        # Rule 3: AI Result Validation (HEALTHY / UNKNOWN / Error)
        if disease == "HEALTHY":
            return False, "NO SPRAY: Crop is healthy.", "", "", 0.0

        if disease == "UNKNOWN" or confidence < 0.60:
            return False, f"NO SPRAY: AI result uncertain (Disease: {disease}, Confidence: {confidence*100:.1f}%). Fail-closed policy active.", "", "", 0.0

        # Rule 4: DB-driven Treatment Mapping lookup
        config = db.query(models.TreatmentConfig).filter(
            models.TreatmentConfig.disease_name == disease,
            models.TreatmentConfig.enabled == True
        ).first()

        if not config:
            # Fallback defaults if DB row not explicitly created yet
            if disease == "DISEASE_1":
                return True, "AUTHORIZED: Spraying Tank 1 / Pump 1 for Disease 1.", "Tank 1", "Pump 1", settings.DEFAULT_SPRAY_DURATION_SEC
            elif disease == "DISEASE_2":
                return True, "AUTHORIZED: Spraying Tank 2 / Pump 2 for Disease 2.", "Tank 2", "Pump 2", settings.DEFAULT_SPRAY_DURATION_SEC
            else:
                return False, f"NO SPRAY: No enabled treatment configuration mapping found for {disease}.", "", "", 0.0

        return True, f"AUTHORIZED: Spraying {config.tank_id} / {config.pump_id} for {disease} ({config.duration_sec}s).", config.tank_id, config.pump_id, config.duration_sec

    @staticmethod
    def evaluate_irrigation_safety(
        soil_moisture: float,
        rain_detected: bool,
        rover_mode: str,
        suppress_if_rain: bool = True,
        min_soil_moisture: float = 70.0
    ) -> tuple[bool, str]:
        """
        Evaluates smart irrigation safety rules according to SRS FR-15, FR-17:
        Returns: (authorized: bool, reason: str)
        """
        if rover_mode == "EMERGENCY_STOP":
            return False, "BLOCKED: Emergency Stop active. All pumps disabled."

        if suppress_if_rain and rain_detected:
            return False, "BLOCKED BY SAFETY: Rain sensor detected precipitation. Irrigation suppressed."

        if soil_moisture >= min_soil_moisture:
            return False, f"BLOCKED BY SAFETY: Soil moisture level ({soil_moisture:.1f}%) is already above threshold ({min_soil_moisture:.1f}%)."

        return True, f"AUTHORIZED: Soil moisture ({soil_moisture:.1f}%) requires irrigation."

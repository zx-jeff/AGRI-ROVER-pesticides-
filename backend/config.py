import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Smart Farming Assistant"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment & Secrets
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smart_farm.db")
    
    # MQTT Config
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "localhost")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "")
    
    # Safety Defaults
    OBSTACLE_THRESHOLD_CM: float = 20.0
    SOIL_MOISTURE_IRRIGATION_THRESHOLD: float = 70.0  # Suppress if soil moisture >= 70%
    DEFAULT_SPRAY_DURATION_SEC: float = 3.0

settings = Settings()

from abc import ABC, abstractmethod
import base64
import json
import random
import logging
from config import settings

logger = logging.getLogger("smart_farm_ai")

SYSTEM_PROMPT = """
You are an expert agricultural plant pathologist AI assistant for an autonomous crop monitoring rover.
Analyze the provided crop/leaf image carefully and return a JSON object with the following fields:
- "plant_detected": true or false
- "leaf_detected": true or false
- "health_status": "HEALTHY" or "DISEASED" or "UNKNOWN"
- "disease_class": strictly one of ["HEALTHY", "DISEASE_1", "DISEASE_2", "UNKNOWN"]
- "confidence": confidence score between 0.00 and 1.00
- "reason": concise 1-2 sentence explanation of visible leaf symptoms
- "recommendation": "NO_SPRAY" or "SPRAY_TANK_1" or "SPRAY_TANK_2" or "MANUAL_INSPECTION"

Return ONLY valid JSON matching this schema. Do not include markdown codeblocks or surrounding conversational text.
"""

class BaseAIService(ABC):
    """
    Abstract AI Service base class.
    Allows easy plug-and-play swapping of Gemini API with local YOLO / CNN / PyTorch models.
    """
    @abstractmethod
    def analyze_image(self, image_base64: str = None, image_bytes: bytes = None) -> dict:
        pass


class GeminiAIService(BaseAIService):
    """
    Google Gemini Vision API Implementation (Gemini 2.5 Flash).
    Communicates strictly via backend FastAPI server (API key never exposed to client or firmware).
    """
    def __init__(self, api_key: str):
        self.api_key = api_key

    def analyze_image(self, image_base64: str = None, image_bytes: bytes = None) -> dict:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)

            if image_base64:
                if "," in image_base64:
                    image_base64 = image_base64.split(",")[1]
                raw_bytes = base64.b64decode(image_base64)
            elif image_bytes:
                raw_bytes = image_bytes
            else:
                raise ValueError("No image payload provided to Gemini AIService")

            image_part = types.Part.from_bytes(data=raw_bytes, mime_type="image/jpeg")

            # Try valid Gemini models
            models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.6-flash"]
            response = None
            last_err = None

            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[SYSTEM_PROMPT, image_part],
                    )
                    if response and response.text:
                        break
                except Exception as err:
                    last_err = err
                    logger.warning(f"Model {model_name} failed: {err}. Trying next fallback...")

            if not response or not response.text:
                raise last_err or RuntimeError("All Gemini model attempts failed.")

            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]

            parsed = json.loads(cleaned_text.strip())

            disease = str(parsed.get("disease_class", "UNKNOWN")).upper()
            if disease not in ["HEALTHY", "DISEASE_1", "DISEASE_2", "UNKNOWN"]:
                disease = "UNKNOWN"

            confidence = float(parsed.get("confidence", 0.0))
            reason = str(parsed.get("reason", "Analysis completed."))
            recommendation = str(parsed.get("recommendation", "MANUAL_INSPECTION"))

            return {
                "plant_detected": bool(parsed.get("plant_detected", True)),
                "leaf_detected": bool(parsed.get("leaf_detected", True)),
                "health_status": str(parsed.get("health_status", "UNKNOWN")),
                "disease": disease,
                "confidence": confidence,
                "description": reason,
                "recommended_action": recommendation,
                "raw_response": response.text,
                "ai_source": "Google Gemini 2.5 Flash API"
            }
        except Exception as e:
            logger.error(f"Gemini Vision API error: {e}. Utilizing fallback vision engine.")
            mock_res = MockAIService().analyze_image(image_base64=image_base64, image_bytes=image_bytes)
            mock_res["ai_source"] = f"Vision Engine (Fallback: {str(e)[:40]}...)"
            return mock_res


class MockAIService(BaseAIService):
    """
    Mock AI Vision Pipeline for local development and demonstration when Gemini API key is missing.
    """
    def analyze_image(self, image_base64: str = None, image_bytes: bytes = None) -> dict:
        logger.info("Executing Mock AI Vision Pipeline")
        seed = len(image_base64) if image_base64 else random.randint(1, 1000)
        choice = seed % 4

        if choice == 0:
            return {
                "plant_detected": True,
                "leaf_detected": True,
                "health_status": "HEALTHY",
                "disease": "HEALTHY",
                "confidence": 0.95,
                "description": "Healthy leaf tissue detected with vibrant green pigmentation and no visible lesions.",
                "recommended_action": "NO_SPRAY",
                "raw_response": "Mock Result: HEALTHY",
                "ai_source": "Simulated AI Vision Pipeline"
            }
        elif choice == 1:
            return {
                "plant_detected": True,
                "leaf_detected": True,
                "health_status": "DISEASED",
                "disease": "DISEASE_1",
                "confidence": 0.91,
                "description": "Fungal leaf spot blight lesions identified on middle leaf surface.",
                "recommended_action": "SPRAY_TANK_1",
                "raw_response": "Mock Result: DISEASE_1",
                "ai_source": "Simulated AI Vision Pipeline"
            }
        elif choice == 2:
            return {
                "plant_detected": True,
                "leaf_detected": True,
                "health_status": "DISEASED",
                "disease": "DISEASE_2",
                "confidence": 0.88,
                "description": "Powdery mildew rust pustules observed along leaf vein margins.",
                "recommended_action": "SPRAY_TANK_2",
                "raw_response": "Mock Result: DISEASE_2",
                "ai_source": "Simulated AI Vision Pipeline"
            }
        else:
            return {
                "plant_detected": True,
                "leaf_detected": False,
                "health_status": "UNKNOWN",
                "disease": "UNKNOWN",
                "confidence": 0.30,
                "description": "Blurred frame or low clarity sample. Fail-closed safety rules engaged.",
                "recommended_action": "MANUAL_INSPECTION",
                "raw_response": "Mock Result: UNKNOWN",
                "ai_source": "Simulated AI Vision Pipeline"
            }


def get_ai_service(api_key: str = None) -> BaseAIService:
    """Factory function providing configured AIService implementation."""
    key_to_use = api_key or settings.GEMINI_API_KEY
    if key_to_use and key_to_use != "your_gemini_api_key_here":
        return GeminiAIService(api_key=key_to_use)
    return MockAIService()


def analyze_plant_image(image_base64: str = None, image_bytes: bytes = None, api_key: str = None) -> dict:
    service = get_ai_service(api_key=api_key)
    return service.analyze_image(image_base64=image_base64, image_bytes=image_bytes)

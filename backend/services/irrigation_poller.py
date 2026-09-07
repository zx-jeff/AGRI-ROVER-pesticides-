import asyncio
import logging
import httpx
from database import SessionLocal
import models
from services.websocket_manager import ws_manager

logger = logging.getLogger("irrigation_poller")

class IrrigationPoller:
    def __init__(self):
        self.is_running = False
        self._task = None

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._poll_loop())
            logger.info("Started NodeMCU ESP8266 Active Direct HTTP Poller Service")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            logger.info("Stopped NodeMCU ESP8266 Direct HTTP Poller Service")

    async def _poll_loop(self):
        while self.is_running:
            try:
                await asyncio.sleep(2.5)

                db = SessionLocal()
                config = db.query(models.IrrigationAutoConfig).first()
                ip_address = config.ip_address if config else None
                db.close()

                if not ip_address or not ip_address.strip():
                    continue

                formatted_ip = ip_address.strip()
                if not formatted_ip.startswith("http://") and not formatted_ip.startswith("https://"):
                    formatted_ip = f"http://{formatted_ip}"

                base_url = formatted_ip.rstrip("/")
                endpoints = ["/telemetry", "/status", "/read", "/data"]

                async with httpx.AsyncClient(timeout=1.5) as client:
                    data = None
                    for ep in endpoints:
                        try:
                            res = await client.get(f"{base_url}{ep}")
                            if res.status_code == 200:
                                data = res.json()
                                break
                        except Exception:
                            continue

                    if data and isinstance(data, dict):
                        soil_moisture = float(data.get("soil_moisture", data.get("moisture", 35.0)))
                        rain_detected = bool(data.get("rain_detected", data.get("rain", False)))
                        temperature = float(data.get("temperature", data.get("temp", 28.5)))
                        humidity = float(data.get("humidity", data.get("hum", 62.0)))
                        pump = bool(data.get("pump", data.get("relay", False)))

                        db = SessionLocal()
                        sensor = models.SensorReading(
                            temperature=temperature,
                            humidity=humidity,
                            soil_moisture=soil_moisture,
                            rain_detected=rain_detected
                        )
                        db.add(sensor)

                        status_str = "PUMP_ON" if pump else "PUMP_OFF"
                        latest_event = db.query(models.IrrigationEvent).order_by(models.IrrigationEvent.timestamp.desc()).first()
                        if not latest_event or latest_event.status != status_str:
                            event = models.IrrigationEvent(
                                zone_name="Main Field",
                                trigger_type="NODEMCU_HTTP_REPORT",
                                status=status_str,
                                duration_sec=0
                            )
                            db.add(event)

                        db.commit()
                        db.close()

                        # Broadcast live telemetry over WebSocket
                        await ws_manager.broadcast("IRRIGATION_TELEMETRY", {
                            "device_id": "IRRIGATION-NODEMCU-01",
                            "soil_moisture": soil_moisture,
                            "soil_raw": data.get("soil_raw", int((100.0 - soil_moisture) * 10)),
                            "rain_detected": rain_detected,
                            "rain_raw": data.get("rain_raw", 0 if rain_detected else 1),
                            "temperature": temperature,
                            "humidity": humidity,
                            "pump": pump
                        })

            except asyncio.CancelledError:
                break
            except Exception as e:
                # Silently catch unreachable host exceptions
                pass

irrigation_poller = IrrigationPoller()

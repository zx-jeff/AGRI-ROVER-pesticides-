import ssl
import json
import logging
import asyncio
import paho.mqtt.client as mqtt
from config import settings
from services.websocket_manager import ws_manager

logger = logging.getLogger("mqtt_service")

# Exact topics discovered from firmware
ROVER_ID = "ROVER-ESP32-01"
IRRIGATION_ID = "IRRIGATION-NODEMCU-01"

# Firmware topics
ROVER_ID = "ROVER-ESP32-01"
IRRIGATION_ID = "IRRIGATION-NODEMCU-01"

ROVER_TELEMETRY_TOPICS = [f"farm/rover/{ROVER_ID}/telemetry", "farm/rover/ROVER_01/telemetry", "farm/rover/telemetry"]
ROVER_COMMAND_TOPICS = [f"farm/rover/{ROVER_ID}/command", "farm/rover/ROVER_01/command", "farm/rover/command"]
ROVER_ACK_TOPICS = [f"farm/rover/{ROVER_ID}/ack", "farm/rover/ROVER_01/ack", "farm/rover/ack"]

IRRIGATION_TELEMETRY_TOPICS = [f"farm/irrigation/{IRRIGATION_ID}/telemetry", "farm/irrigation/IRRIG_01/telemetry", "farm/irrigation/telemetry"]
IRRIGATION_COMMAND_TOPICS = [f"farm/irrigation/{IRRIGATION_ID}/command", "farm/irrigation/IRRIG_01/command", "farm/irrigation/command"]
IRRIGATION_ACK_TOPICS = [f"farm/irrigation/{IRRIGATION_ID}/ack", "farm/irrigation/IRRIG_01/ack", "farm/irrigation/ack"]

class MQTTService:
    def __init__(self):
        self.client = mqtt.Client(client_id=f"Backend-Server-{ROVER_ID}", protocol=mqtt.MQTTv311)
        self.is_connected = False
        self.loop = None

        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
        
        if settings.MQTT_PORT == 8883:
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            self.client.tls_set_context(context)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.is_connected = True
            logger.info("Successfully connected to HiveMQ MQTT Cloud Broker TLS")
            
            for t in ROVER_TELEMETRY_TOPICS + ROVER_ACK_TOPICS + IRRIGATION_TELEMETRY_TOPICS + IRRIGATION_ACK_TOPICS:
                client.subscribe(t)
            logger.info(f"Subscribed to all firmware MQTT topics.")
        else:
            logger.error(f"MQTT Connection Failed with return code: {rc}")

    def _on_disconnect(self, client, userdata, rc):
        self.is_connected = False
        logger.warning(f"MQTT Disconnected (code {rc}). Retrying connection...")

    def _on_message(self, client, userdata, msg):
        try:
            payload_str = msg.payload.decode('utf-8')
            data = json.loads(payload_str) if payload_str.startswith("{") else {"raw": payload_str}
            topic = msg.topic

            logger.info(f"MQTT Message Received on [{topic}]: {payload_str[:100]}...")

            loop = self.loop
            if loop and loop.is_running():
                if topic in ROVER_TELEMETRY_TOPICS:
                    if data.get("command") == "INSPECTION_REQUEST":
                        self._handle_inspection_request(data)
                    asyncio.run_coroutine_threadsafe(
                        ws_manager.broadcast("ROVER_TELEMETRY", data),
                        loop
                    )

                elif topic in ROVER_ACK_TOPICS:
                    asyncio.run_coroutine_threadsafe(
                        ws_manager.broadcast("ROVER_ACK", data),
                        loop
                    )

                elif topic in IRRIGATION_TELEMETRY_TOPICS:
                    self._save_irrigation_telemetry(data)
                    asyncio.run_coroutine_threadsafe(
                        ws_manager.broadcast("IRRIGATION_TELEMETRY", data),
                        loop
                    )

                elif topic in IRRIGATION_ACK_TOPICS:
                    asyncio.run_coroutine_threadsafe(
                        ws_manager.broadcast("IRRIGATION_ACK", data),
                        loop
                    )

        except Exception as e:
            logger.error(f"Error handling MQTT message on {msg.topic}: {e}")

    def _save_irrigation_telemetry(self, data: dict):
        """Persists incoming MQTT NodeMCU telemetry to DB."""
        try:
            from database import SessionLocal
            import models

            db = SessionLocal()
            soil_moisture = float(data.get("soil_moisture", 35.0))
            rain_detected = bool(data.get("rain_detected", False))
            temperature = float(data.get("temperature", 28.5))
            humidity = float(data.get("humidity", 62.0))

            sensor = models.SensorReading(
                temperature=temperature,
                humidity=humidity,
                soil_moisture=soil_moisture,
                rain_detected=rain_detected
            )
            db.add(sensor)

            if "pump" in data:
                pump_on = bool(data["pump"])
                status_str = "PUMP_ON" if pump_on else "PUMP_OFF"
                latest_event = db.query(models.IrrigationEvent).order_by(models.IrrigationEvent.timestamp.desc()).first()
                if not latest_event or latest_event.status != status_str:
                    event = models.IrrigationEvent(
                        zone_name="Main Field",
                        trigger_type="NODEMCU_REPORT",
                        status=status_str,
                        duration_sec=0
                    )
                    db.add(event)

            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Error saving MQTT irrigation telemetry to DB: {e}")

    def _handle_inspection_request(self, data):
        """Processes plant inspection trigger from IR Sensor and issues treatment command."""
        request_id = data.get("request_id") or data.get("inspection_id") or "INS_AUTO"
        logger.info(f"Processing IR Inspection Request: {request_id}")
        
        cmd_payload = {
            "command": "INSPECTION_COMPLETE",
            "request_id": request_id
        }
        self.publish_rover_command(cmd_payload)

    def publish_rover_command(self, command_dict: dict) -> bool:
        """Publishes exact JSON command payload to Rover ESP32 command topics."""
        if not self.is_connected:
            logger.warning("Cannot publish MQTT command: Client disconnected")
            return False
        try:
            payload = json.dumps(command_dict)
            for top in ROVER_COMMAND_TOPICS:
                self.client.publish(top, payload)
            logger.info(f"Published Rover Command: {payload}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish Rover MQTT command: {e}")
            return False

    def publish_irrigation_command(self, command_dict: dict) -> bool:
        """Publishes exact string commands (MANUAL_ON, MANUAL_OFF, AUTO_IRRIGATE:ms) expected by NodeMCU firmware."""
        if not self.is_connected:
            logger.warning("Cannot publish MQTT command: Client disconnected")
            return False
        try:
            cmd = str(command_dict.get("command") or command_dict.get("cmd") or "").upper()
            dur_sec = int(command_dict.get("duration_sec", 10))
            dur_ms = int(command_dict.get("duration_ms", dur_sec * 1000))
            threshold = int(command_dict.get("threshold", 40))

            payloads_to_send = []
            if cmd in ["MANUAL_ON", "ON", "IRRIGATE"]:
                payloads_to_send = [
                    "MANUAL_ON",
                    f"AUTO_IRRIGATE:{dur_ms}",
                    f"START_IRRIGATION_{dur_sec}",
                    json.dumps(command_dict)
                ]
            elif cmd in ["MANUAL_OFF", "OFF", "STOP_IRRIGATION"]:
                payloads_to_send = [
                    "MANUAL_OFF",
                    "STOP_IRRIGATION",
                    json.dumps(command_dict)
                ]
            elif cmd in ["AUTO_IRRIGATE", "AUTO"]:
                payloads_to_send = [
                    f"SET_MOISTURE_THRESHOLD:{threshold}",
                    f"SET_DURATION:{dur_ms}",
                    f"AUTO_IRRIGATE:{dur_ms}"
                ]
            else:
                payloads_to_send = [
                    cmd,
                    "MANUAL_ON",
                    json.dumps(command_dict)
                ]

            topic = "farm/irrigation/IRRIGATION-NODEMCU-01/command"
            for p in payloads_to_send:
                self.client.publish(topic, p)

            # Also publish to secondary topic for fallback
            self.client.publish("farm/irrigation/IRRIG_01/command", payloads_to_send[0])

            logger.info(f"Published exact ESP commands to [{topic}]: {payloads_to_send}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish Irrigation MQTT command: {e}")
            return False

    def start(self, loop=None):
        self.loop = loop
        try:
            self.client.connect_async(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
            self.client.loop_start()
            logger.info(f"Connecting to MQTT Broker {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
        except Exception as e:
            logger.error(f"Failed to start MQTT client background loop: {e}")

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()

mqtt_service = MQTTService()

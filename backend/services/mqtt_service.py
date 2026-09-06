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

ROVER_TELEMETRY_TOPIC = f"farm/rover/{ROVER_ID}/telemetry"
ROVER_COMMAND_TOPIC = f"farm/rover/{ROVER_ID}/command"
ROVER_ACK_TOPIC = f"farm/rover/{ROVER_ID}/ack"

IRRIGATION_TELEMETRY_TOPIC = f"farm/irrigation/{IRRIGATION_ID}/telemetry"
IRRIGATION_COMMAND_TOPIC = f"farm/irrigation/{IRRIGATION_ID}/command"
IRRIGATION_ACK_TOPIC = f"farm/irrigation/{IRRIGATION_ID}/ack"

class MQTTService:
    def __init__(self):
        self.client = mqtt.Client(client_id=f"Backend-Server-{ROVER_ID}", protocol=mqtt.MQTTv311)
        self.is_connected = False

        # Configure Credentials & TLS for HiveMQ Cloud
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
        
        if settings.MQTT_PORT == 8883:
            # Enable TLS SSL context for HiveMQ Cloud
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
            
            # Subscribe to all discovered firmware topics
            client.subscribe(ROVER_TELEMETRY_TOPIC)
            client.subscribe(ROVER_ACK_TOPIC)
            client.subscribe(IRRIGATION_TELEMETRY_TOPIC)
            client.subscribe(IRRIGATION_ACK_TOPIC)
            logger.info(f"Subscribed to firmware topics: {ROVER_TELEMETRY_TOPIC}, {IRRIGATION_TELEMETRY_TOPIC}")
        else:
            logger.error(f"MQTT Connection Failed with return code: {rc}")

    def _on_disconnect(self, client, userdata, rc):
        self.is_connected = False
        logger.warning(f"MQTT Disconnected (code {rc}). Retrying connection...")

    def _on_message(self, client, userdata, msg):
        try:
            payload_str = msg.payload.decode('utf-8')
            data = json.loads(payload_str)
            topic = msg.topic

            logger.info(f"MQTT Message Received on [{topic}]: {payload_str[:100]}...")

            loop = asyncio.get_event_loop()

            if topic == ROVER_TELEMETRY_TOPIC:
                # Handle IR Plant Inspection Request
                if data.get("command") == "INSPECTION_REQUEST":
                    self._handle_inspection_request(data)
                
                # Broadcast live rover telemetry to WebSocket
                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast("ROVER_TELEMETRY", data),
                    loop
                )

            elif topic == ROVER_ACK_TOPIC:
                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast("ROVER_ACK", data),
                    loop
                )

            elif topic == IRRIGATION_TELEMETRY_TOPIC:
                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast("IRRIGATION_TELEMETRY", data),
                    loop
                )

            elif topic == IRRIGATION_ACK_TOPIC:
                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast("IRRIGATION_ACK", data),
                    loop
                )

        except Exception as e:
            logger.error(f"Error handling MQTT message on {msg.topic}: {e}")

    def _handle_inspection_request(self, data):
        """Processes plant inspection trigger from IR Sensor and issues treatment command."""
        request_id = data.get("request_id") or data.get("inspection_id") or "INS_AUTO"
        logger.info(f"Processing IR Inspection Request: {request_id}")
        
        # Default safety protocol: Send INSPECTION_COMPLETE or treatment
        cmd_payload = {
            "command": "INSPECTION_COMPLETE",
            "request_id": request_id
        }
        self.publish_rover_command(cmd_payload)

    def publish_rover_command(self, command_dict: dict) -> bool:
        """Publishes exact JSON command payload to Rover ESP32 command topic."""
        if not self.is_connected:
            logger.warning("Cannot publish MQTT command: Client disconnected")
            return False
        try:
            payload = json.dumps(command_dict)
            self.client.publish(ROVER_COMMAND_TOPIC, payload)
            logger.info(f"Published Rover Command to [{ROVER_COMMAND_TOPIC}]: {payload}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish Rover MQTT command: {e}")
            return False

    def publish_irrigation_command(self, command_dict: dict) -> bool:
        """Publishes exact JSON command payload to Irrigation NodeMCU command topic."""
        if not self.is_connected:
            logger.warning("Cannot publish MQTT command: Client disconnected")
            return False
        try:
            payload = json.dumps(command_dict)
            self.client.publish(IRRIGATION_COMMAND_TOPIC, payload)
            logger.info(f"Published Irrigation Command to [{IRRIGATION_COMMAND_TOPIC}]: {payload}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish Irrigation MQTT command: {e}")
            return False

    def start(self):
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

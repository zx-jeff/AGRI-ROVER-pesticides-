/*
 * Smart Farming Assistant - ESP32 Smart Irrigation & Treatment Pump Node
 * Version 1.0 | SRS Compliant (SRS Sec 9.3 & 9.4)
 * 
 * Hardware: ESP32 NodeMCU, 4-Channel Relay Driver, Capacitive Soil Moisture Sensor, Rain Sensor module
 */

#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* mqtt_broker = "192.168.1.100";
const int mqtt_port = 1883;

// Topics
const char* TOPIC_IRRIGATION_TELEMETRY = "farm/irrigation/IRRIG_01/telemetry";
const char* TOPIC_IRRIGATION_COMMAND   = "farm/irrigation/IRRIG_01/command";
const char* TOPIC_IRRIGATION_ACK       = "farm/irrigation/IRRIG_01/ack";

// Pin Mappings
#define RELAY_IRRIGATION_PUMP  25
#define RELAY_TREATMENT_PUMP1  26 // Disease 1 spray
#define RELAY_TREATMENT_PUMP2  27 // Disease 2 spray
#define SOIL_MOISTURE_PIN      34 // Analog ADC
#define RAIN_SENSOR_PIN        35 // Digital input (LOW when raining)

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastTelemetry = 0;

void setup() {
  Serial.begin(115200);

  pinMode(RELAY_IRRIGATION_PUMP, OUTPUT);
  pinMode(RELAY_TREATMENT_PUMP1, OUTPUT);
  pinMode(RELAY_TREATMENT_PUMP2, OUTPUT);
  
  // Relays active LOW default off
  digitalWrite(RELAY_IRRIGATION_PUMP, HIGH);
  digitalWrite(RELAY_TREATMENT_PUMP1, HIGH);
  digitalWrite(RELAY_TREATMENT_PUMP2, HIGH);

  pinMode(RAIN_SENSOR_PIN, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nIrrigation ESP32 Connected!");

  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(mqttCallback);
}

void triggerRelayTimed(int relayPin, int durationMs) {
  digitalWrite(relayPin, LOW); // Turn relay ON
  delay(durationMs);
  digitalWrite(relayPin, HIGH); // Turn relay OFF
}

void emergencyAllOff() {
  digitalWrite(RELAY_IRRIGATION_PUMP, HIGH);
  digitalWrite(RELAY_TREATMENT_PUMP1, HIGH);
  digitalWrite(RELAY_TREATMENT_PUMP2, HIGH);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("Irrigation Command Received: " + message);

  if (message == "EMERGENCY_STOP") {
    emergencyAllOff();
    client.publish(TOPIC_IRRIGATION_ACK, "{\"status\":\"EMERGENCY_STOP\",\"message\":\"All pumps shut down immediately.\"}");
    return;
  }

  // Parse pulse command: e.g. "SPRAY_PUMP1_3" or "START_IRRIGATION_10"
  if (message.startsWith("SPRAY_PUMP1_")) {
    int durationSec = message.substring(12).toInt();
    if (durationSec <= 0) durationSec = 3;
    triggerRelayTimed(RELAY_TREATMENT_PUMP1, durationSec * 1000);
    client.publish(TOPIC_IRRIGATION_ACK, "{\"status\":\"COMPLETED\",\"pump\":\"Pump 1\"}");
  } 
  else if (message.startsWith("SPRAY_PUMP2_")) {
    int durationSec = message.substring(12).toInt();
    if (durationSec <= 0) durationSec = 3;
    triggerRelayTimed(RELAY_TREATMENT_PUMP2, durationSec * 1000);
    client.publish(TOPIC_IRRIGATION_ACK, "{\"status\":\"COMPLETED\",\"pump\":\"Pump 2\"}");
  }
  else if (message.startsWith("START_IRRIGATION_")) {
    int durationSec = message.substring(17).toInt();
    if (durationSec <= 0) durationSec = 10;
    triggerRelayTimed(RELAY_IRRIGATION_PUMP, durationSec * 1000);
    client.publish(TOPIC_IRRIGATION_ACK, "{\"status\":\"COMPLETED\",\"pump\":\"Irrigation Pump\"}");
  }
}

void sendTelemetry() {
  int rawSoil = analogRead(SOIL_MOISTURE_PIN);
  float soilMoisturePct = map(rawSoil, 4095, 1500, 0, 100);
  soilMoisturePct = constrain(soilMoisturePct, 0.0, 100.0);

  bool isRaining = (digitalRead(RAIN_SENSOR_PIN) == LOW);

  String json = "{"
    "\"device_id\":\"IRRIG_01\","
    "\"soil_moisture\":" + String(soilMoisturePct, 1) + ","
    "\"rain_detected\":" + (isRaining ? "true" : "false")
  "}";

  client.publish(TOPIC_IRRIGATION_TELEMETRY, json.c_str());
}

void loop() {
  if (!client.connected()) {
    while (!client.connected()) {
      if (client.connect("ESP32_Irrigation_Node")) {
        client.subscribe(TOPIC_IRRIGATION_COMMAND);
      } else {
        delay(5000);
      }
    }
  }
  client.loop();

  if (millis() - lastTelemetry > 3000) {
    lastTelemetry = millis();
    sendTelemetry();
  }
}

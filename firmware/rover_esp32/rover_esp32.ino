/*
 * Smart Farming Assistant - ESP32 Autonomous Rover Firmware
 * Version 1.0 | SRS Compliant
 * 
 * Hardware: ESP32 Dev Module, L298N Motor Driver, HC-SR04 Ultrasonic Sensor, 12V Battery Monitor
 */

#include <WiFi.h>
#include <PubSubClient.h>

// Wi-Fi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker Credentials (SRS FR-03, 7.1)
const char* mqtt_broker = "192.168.1.100";
const int mqtt_port = 1883;
const char* mqtt_user = "farm_rover";
const char* mqtt_pass = "rover_pass";

// MQTT Topics
const char* TOPIC_TELEMETRY = "farm/rover/ROVER_01/telemetry";
const char* TOPIC_COMMAND   = "farm/rover/ROVER_01/command";
const char* TOPIC_ACK       = "farm/rover/ROVER_01/ack";

// Pin Definitions
#define MOTOR_LEFT_IN1  26
#define MOTOR_LEFT_IN2  27
#define MOTOR_RIGHT_IN3 14
#define MOTOR_RIGHT_IN4 12
#define TRIG_PIN        5
#define ECHO_PIN        18
#define BATTERY_PIN     34 // ADC Pin for Voltage Divider

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastHeartbeat = 0;
String currentMode = "MANUAL";
String currentStatus = "IDLE";
float batteryLevel = 95.0;
float obstacleDistanceCm = 150.0;

void setup() {
  Serial.begin(115200);
  
  pinMode(MOTOR_LEFT_IN1, OUTPUT);
  pinMode(MOTOR_LEFT_IN2, OUTPUT);
  pinMode(MOTOR_RIGHT_IN3, OUTPUT);
  pinMode(MOTOR_RIGHT_IN4, OUTPUT);
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  stopMotors();
  
  setupWifi();
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(mqttCallback);
}

void setupWifi() {
  delay(10);
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void reconnectMqtt() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT Broker...");
    if (client.connect("ESP32_Rover_ROVER_01", mqtt_user, mqtt_pass)) {
      Serial.println(" Connected!");
      client.subscribe(TOPIC_COMMAND);
      sendAck("CONNECTED", "Rover initialized and subscribed to topics.");
    } else {
      Serial.print(" Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5s...");
      delay(5000);
    }
  }
}

float measureObstacleDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return 300.0; // Clear path
  return (duration * 0.0343) / 2.0;
}

void stopMotors() {
  digitalWrite(MOTOR_LEFT_IN1, LOW);
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  digitalWrite(MOTOR_RIGHT_IN3, LOW);
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
}

void moveForward() {
  digitalWrite(MOTOR_LEFT_IN1, HIGH);
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  digitalWrite(MOTOR_RIGHT_IN3, HIGH);
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
}

void moveReverse() {
  digitalWrite(MOTOR_LEFT_IN1, LOW);
  digitalWrite(MOTOR_LEFT_IN2, HIGH);
  digitalWrite(MOTOR_RIGHT_IN3, LOW);
  digitalWrite(MOTOR_RIGHT_IN4, HIGH);
}

void turnLeft() {
  digitalWrite(MOTOR_LEFT_IN1, LOW);
  digitalWrite(MOTOR_LEFT_IN2, HIGH);
  digitalWrite(MOTOR_RIGHT_IN3, HIGH);
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
}

void turnRight() {
  digitalWrite(MOTOR_LEFT_IN1, HIGH);
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  digitalWrite(MOTOR_RIGHT_IN3, LOW);
  digitalWrite(MOTOR_RIGHT_IN4, HIGH);
}

void emergencyStop() {
  stopMotors();
  currentMode = "EMERGENCY_STOP";
  currentStatus = "HALTED";
  sendAck("EMERGENCY_STOP", "Safety cutoff engaged.");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("MQTT Command Received: " + message);

  if (message == "EMERGENCY_STOP") {
    emergencyStop();
    return;
  }

  if (currentMode == "EMERGENCY_STOP" && message != "RESET") {
    sendAck("REJECTED", "Rover in EMERGENCY_STOP state. Reset required.");
    return;
  }

  if (message == "RESET") {
    currentMode = "MANUAL";
    currentStatus = "IDLE";
    sendAck("RESET_COMPLETE", "Rover state reset to MANUAL IDLE.");
    return;
  }

  if (message == "FORWARD") { moveForward(); currentStatus = "MOVING_FORWARD"; }
  else if (message == "REVERSE") { moveReverse(); currentStatus = "MOVING_REVERSE"; }
  else if (message == "LEFT") { turnLeft(); currentStatus = "TURNING_LEFT"; }
  else if (message == "RIGHT") { turnRight(); currentStatus = "TURNING_RIGHT"; }
  else if (message == "STOP") { stopMotors(); currentStatus = "STOPPED"; }
  else if (message == "AUTO") { currentMode = "AUTO"; currentStatus = "NAVIGATING"; }
  else if (message == "MANUAL") { currentMode = "MANUAL"; currentStatus = "IDLE"; stopMotors(); }

  sendAck("EXECUTED", "Command " + message + " executed successfully.");
}

void sendAck(String status, String details) {
  String json = "{\"rover_id\":\"ROVER_01\",\"status\":\"" + status + "\",\"details\":\"" + details + "\"}";
  client.publish(TOPIC_ACK, json.c_str());
}

void sendHeartbeatTelemetry() {
  obstacleDistanceCm = measureObstacleDistance();
  
  // SRS FR-06: Obstacle detection threshold check (< 20cm)
  if (obstacleDistanceCm < 20.0 && currentStatus.startsWith("MOVING")) {
    stopMotors();
    currentStatus = "OBSTACLE_BLOCKED";
    sendAck("OBSTACLE_WARNING", "Critical obstacle detected < 20cm. Auto stopped.");
  }

  String telemetryJson = "{"
    "\"rover_id\":\"ROVER_01\","
    "\"mode\":\"" + currentMode + "\","
    "\"status\":\"" + currentStatus + "\","
    "\"battery\":" + String(batteryLevel, 1) + ","
    "\"obstacle_distance\":" + String(obstacleDistanceCm, 1)
  "}";
  
  client.publish(TOPIC_TELEMETRY, telemetryJson.c_str());
}

void loop() {
  if (!client.connected()) {
    reconnectMqtt();
  }
  client.loop();

  // Send Heartbeat Telemetry every 2 seconds (SRS FR-03, 7.2)
  if (millis() - lastHeartbeat > 2000) {
    lastHeartbeat = millis();
    sendHeartbeatTelemetry();
  }
}

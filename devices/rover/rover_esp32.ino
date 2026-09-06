/*
 * Autonomous Crop Monitoring Rover Firmware - ESP32
 * Version 1.0 | SRS Compliant
 */
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_broker = "YOUR_MQTT_BROKER_IP";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  client.setServer(mqtt_broker, 1883);
}

void loop() {
  if (!client.connected()) {
    client.connect("ESP32_Rover_ROVER_01");
  }
  client.loop();
}

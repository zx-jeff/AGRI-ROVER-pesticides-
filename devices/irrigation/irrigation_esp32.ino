/*
 * ESP32 Smart Irrigation & Treatment Spray Pump Node Firmware
 */
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
}

void loop() {
  delay(1000);
}

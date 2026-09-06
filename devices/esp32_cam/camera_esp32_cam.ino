/*
 * ESP32-CAM Live MJPEG Streaming Node Firmware
 * Streams live MJPEG video over http://ESP32_CAM_IP:81/stream
 */
#include "esp_camera.h"
#include <WiFi.h>
#include <esp_http_server.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

httpd_handle_t stream_httpd = NULL;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  Serial.println("ESP32-CAM MJPEG Stream ready on http://" + WiFi.localIP().toString() + ":81/stream");
}

void loop() {
  delay(1000);
}

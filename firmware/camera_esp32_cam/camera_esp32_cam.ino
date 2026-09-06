/*
 * Smart Farming Assistant - ESP32-CAM Image Capture & AI Upload Node
 * Version 1.0 | SRS Compliant (SRS FR-08, 9.2)
 * 
 * Hardware: AI Thinker ESP32-CAM (OV2640 camera module)
 * Note: Never stores Gemini API Keys in camera firmware (SRS FR-08).
 * Sends raw JPEG stream to Backend FastAPI endpoint for secure cloud AI analysis.
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend API URL (SRS Sec 6.1: ESP32-CAM -> HTTPS image upload -> FastAPI)
const char* serverUrl = "http://192.168.1.100:8000/api/ai/upload-and-analyze";

// ESP32-CAM AI Thinker Pin Map
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define FLASH_LED_PIN      4

void setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_siod = SIOD_GPIO_NUM;
  config.pin_sioc = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA; // 1600x1200 high-res leaf detail
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW); // Flash LED Off

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nESP32-CAM WiFi Connected!");

  setupCamera();
}

bool captureAndUploadImage() {
  // Briefly illuminate LED flash for crisp leaf capture
  digitalWrite(FLASH_LED_PIN, HIGH);
  delay(150);
  
  camera_fb_t * fb = esp_camera_fb_get();
  digitalWrite(FLASH_LED_PIN, LOW);

  if(!fb) {
    Serial.println("Camera capture failed!");
    return false;
  }

  HTTPClient http;
  http.begin(serverUrl);
  
  String boundary = "------------------------ESP32CAMBoundary";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"crop_scan.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  uint32_t extraLen = head.length() + tail.length();
  uint32_t totalLen = fb->len + extraLen;

  uint8_t *buffer = (uint8_t *)malloc(totalLen);
  if(!buffer) {
    esp_camera_fb_return(fb);
    return false;
  }

  memcpy(buffer, head.c_str(), head.length());
  memcpy(buffer + head.length(), fb->buf, fb->len);
  memcpy(buffer + head.length() + fb->len, tail.c_str(), tail.length());

  int httpResponseCode = http.POST(buffer, totalLen);
  free(buffer);
  esp_camera_fb_return(fb);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response Code: " + String(httpResponseCode));
    Serial.println("AI Analysis Result: " + response);
    http.end();
    return true;
  } else {
    Serial.println("Upload failed, HTTP code: " + String(httpResponseCode));
    http.end();
    return false;
  }
}

void loop() {
  // Listens for external signal / inspection trigger
  if (Serial.available()) {
    char ch = Serial.read();
    if (ch == 'C' || ch == 'c') {
      Serial.println("Inspection Triggered: Capturing plant image...");
      captureAndUploadImage();
    }
  }
  delay(100);
}

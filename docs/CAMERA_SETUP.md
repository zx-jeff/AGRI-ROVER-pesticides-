# ESP32-CAM Streaming & AI Frame Sampling Setup Guide

## Architecture Overview
The system isolates continuous human video monitoring from AI vision processing:

```text
ESP32-CAM (OV2640)
  │
  ├── Continuous MJPEG Stream (20 FPS) ──> Web Dashboard Camera Window
  │
  └── Single Still Frame Sampling (On Plant Stop) ──> FastAPI Backend ──> Gemini Vision API
```

## ESP32-CAM Configuration
1. Flash `devices/esp32_cam/camera_esp32_cam.ino` using Arduino IDE with **AI Thinker ESP32-CAM** board selected.
2. Ensure stable 5V / 2A external power supply (do not power directly from 3.3V FTDI adapter).
3. Live stream is served at `http://<ESP32_CAM_IP>:81/stream`.
4. Gemini API Key is stored ONLY in FastAPI `.env` on backend server.

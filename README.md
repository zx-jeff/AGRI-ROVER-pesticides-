# 🌿 AgriRover AI — Smart Farming Assistant & Autonomous Crop Monitoring Rover

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Framework: Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014-blue)](https://nextjs.org/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![AI: Google Gemini](https://img.shields.io/badge/AI-Gemini%203.6%20Flash-orange)](https://ai.google.dev/)
[![MQTT: HiveMQ TLS](https://img.shields.io/badge/MQTT-HiveMQ%20Cloud%20TLS-purple)](https://www.hivemq.com/)

An end-to-end **AI-Powered Smart Farming Assistant** integrated with physical autonomous crop monitoring rovers, automated smart irrigation nodes, live camera streams, and Google Gemini Vision AI for real-time plant pathology diagnosis.

---

## 📐 System Architecture

```text
                  AGRIROVER SMART FARMING PLATFORM
                                 │
          ┌──────────────────────┴──────────────────────┐
          │                                             │
   NEXT.JS FRONTEND                              FASTAPI BACKEND
(Dashboard / Controls / ROI)                 (REST / WebSockets / AI)
          │                                             │
          │                       ┌─────────────────────┴─────────────────────┐
          │                       │                                           │
          │                  HIVEMQ TLS MQTT                             GEMINI VISION AI
          │                  (Port 8883)                            (Pathology Diagnosis)
          │                       │                                           │
          │             ┌─────────┴─────────┐                                 │
          │             │                   │                                 │
          │        Rover ESP32       Irrigation NodeMCU                 ESP32-CAM
          │     (ROVER-ESP32-01)   (IRRIGATION-NODEMCU-01)        (ESP32-CAM-ROVER-01)
          │             │                   │                                 │
          │     • L298N Motors      • Soil Moisture ADC             • HTTP Server
          │     • IR Plant Sensor   • Rain Sensor                   • JPEG Capture
          │     • 4x Ultrasonics    • DHT11 Temp/Humidity           • HTTP POST Upload
          │     • Dual Tank Pumps   • Water Pump Relay              • Live Feed
          │     • NEO-6M GPS        • Safety Cutoff                 
          │                                                                   │
          └───────────────────── Real-Time Sync ──────────────────────────────┘
```

---

## ✨ Key Features

* 🤖 **Firmware-Driven Auto-Integration**: Backend capability discovery layer (`GET /api/devices/`) automatically adapts the web UI according to connected firmware manifests (`firmware-manifest.json`).
* 📸 **Gemini 3.6 Flash Pathology Diagnosis**: Evaluates plant leaf images in real-time, detecting fungal blights, rusts, and lesions with confidence scoring and treatment safety verification.
* 🎯 **Interactive Leaf ROI Selection**: Drag-and-drop bounding box selection on live camera feeds (Laptop Webcam or ESP32-CAM) to crop and analyze targeted leaf sub-regions.
* 🔒 **HiveMQ TLS MQTT Integration**: Secure server-side MQTT client (`paho-mqtt`) subscribing to live telemetry (`farm/rover/ROVER-ESP32-01/telemetry`, `farm/irrigation/IRRIGATION-NODEMCU-01/telemetry`) and publishing exact firmware commands.
* 🚜 **Autonomous & Manual Rover Control**: L298N motor driver controls, obstacle detection (`< 30cm`), IR plant inspection triggers, and GPS location tracking.
* 🧪 **Dual Chemical Tank Sprayers**: Ultrasonic liquid level monitoring (Tank 1 & Tank 2) with automated safety cutoffs (`< 15%` low warning, `< 5%` critical stop).
* 💧 **Smart Irrigation System**: NodeMCU ESP8266 integration reading Soil Moisture ADC, Rain Sensor status, DHT11 Temperature/Humidity, and controlling Water Pump relays safely.
* 🌐 **Multi-Language Support**: Real-time language translation switcher supporting **English** and **8 Indian Regional Languages** (हिन्दी, తెలుగు, தமிழ், मराठी, ಕನ್ನಡ, বাংলা, ગુજરાતી, മലയാളം).

---

## 🛠️ Hardware & Pin Configuration

### 1. Main Rover ESP32 (`ROVER-ESP32-01`)
| Hardware Component | ESP32 GPIO Pin | Function |
|:---|:---|:---|
| L298N Left Motor (IN1 / IN2) | `GPIO 26` / `GPIO 27` | Left Wheel Motor Drive |
| L298N Right Motor (IN3 / IN4) | `GPIO 14` / `GPIO 12` | Right Wheel Motor Drive |
| IR Plant Sensor | `GPIO 34` | Plant Crop Detection (Active LOW) |
| Front-Left Ultrasonic | Trig: `GPIO 16`, Echo: `GPIO 17` | Obstacle Avoidance (`30cm` limit) |
| Front-Right Ultrasonic | Trig: `GPIO 18`, Echo: `GPIO 19` | Obstacle Avoidance (`30cm` limit) |
| Tank 1 Ultrasonic | Trig: `GPIO 21`, Echo: `GPIO 22` | Chemical Tank 1 Level Meter |
| Tank 2 Ultrasonic | Trig: `GPIO 23`, Echo: `GPIO 25` | Chemical Tank 2 Level Meter |
| Treatment Pump 1 Relay | `GPIO 32` | Chemical Sprayer 1 (Active LOW) |
| Treatment Pump 2 Relay | `GPIO 33` | Chemical Sprayer 2 (Active LOW) |
| NEO-6M GPS Module | RX: `GPIO 4`, TX: `GPIO 5` | Satellite Telemetry (9600 Baud) |

### 2. Irrigation NodeMCU (`IRRIGATION-NODEMCU-01`)
| Hardware Component | NodeMCU Pin | Function |
|:---|:---|:---|
| Soil Moisture Sensor | `Analog A0` | ADC Soil Moisture Reading (Dry: 800, Wet: 200) |
| Rain Sensor | `GPIO D6` | Rain Detection (Active LOW) |
| DHT11 Sensor | `GPIO D5` | Temperature & Relative Humidity |
| Water Pump Relay | `GPIO D1` | Water Pump Execution (Active LOW) |

### 3. ESP32-CAM (`ESP32-CAM-ROVER-01`)
| Feature | Configuration |
|:---|:---|
| Board Type | AI Thinker ESP32-CAM |
| Image Quality | VGA (640x480) JPEG, Quality 10 |
| HTTP Server Endpoints | `GET /status`, `GET /capture`, `GET /scan` |
| Upload Endpoint | `POST /api/upload-image` (Headers: `X-Device-ID`, `X-Crop: Tomato`) |

---

## 📡 MQTT Topics & Command Reference

### Rover Commands (`farm/rover/ROVER-ESP32-01/command`)
```json
{ "command": "FORWARD" }
{ "command": "BACKWARD" }
{ "command": "LEFT" }
{ "command": "RIGHT" }
{ "command": "STOP" }
{ "command": "AUTO_MODE" }
{ "command": "MANUAL_MODE" }
{ "command": "PAUSE" }
{ "command": "RESUME" }
{ "command": "EMERGENCY_STOP" }
{ "command": "RESET_EMERGENCY_STOP" }
{ "command": "TREAT_PUMP1", "duration_ms": 5000 }
{ "command": "TREAT_PUMP2", "duration_ms": 5000 }
{ "command": "STOP_TREATMENT" }
{ "command": "INSPECTION_COMPLETE" }
```

### Irrigation Commands (`farm/irrigation/IRRIGATION-NODEMCU-01/command`)
```json
{ "command": "IRRIGATE", "duration_ms": 10000 }
{ "command": "STOP_IRRIGATION" }
{ "command": "EMERGENCY_STOP" }
{ "command": "RESET_EMERGENCY_STOP" }
{ "command": "SET_MOISTURE_THRESHOLD", "threshold": 40.0 }
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* Python 3.10+ / `uv`
* Node.js 18+ & npm
* Arduino IDE (for ESP32 / NodeMCU firmware flashing)

### 2. Backend Setup
```bash
# Navigate to backend folder
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install Python dependencies
pip install -r requirements.txt
pip install paho-mqtt

# Configure Environment Credentials (.env)
cp .env.example .env
# Set your GEMINI_API_KEY and HiveMQ MQTT credentials in .env

# Run FastAPI backend server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Backend API will be running on **`http://localhost:8000`** (Interactive Docs: `http://localhost:8000/docs`).

### 3. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend

# Install Node modules
npm install

# Run Next.js dev server
npm run dev -- -p 3000
```
Open **`http://localhost:3000`** in your web browser.

---

## 📁 Repository Structure

```text
├── backend/
│   ├── main.py                  # FastAPI Application Entrypoint & Lifecycles
│   ├── firmware-manifest.json   # Device Capability Discovery Manifest
│   ├── config.py                # Environment Configuration Loader
│   ├── models.py                # SQLAlchemy Database Models
│   ├── schemas.py               # Pydantic API Schemas
│   ├── routers/
│   │   ├── devices.py           # GET /api/devices/ Capability Endpoint
│   │   ├── camera.py            # POST /api/upload-image & Stream Endpoint
│   │   ├── rover.py             # Rover Control & Navigation API
│   │   ├── irrigation.py        # Smart Irrigation & Safety Evaluation API
│   │   ├── ai.py                # Vision Pathology Diagnostic Endpoint
│   │   └── alerts.py            # System Notifications & Logs
│   └── services/
│       ├── mqtt_service.py      # HiveMQ TLS Client & Telemetry Handler
│       ├── ai_service.py        # Gemini 3.6 Flash Vision Pipeline
│       └── safety_engine.py     # Crop Safety & Policy Evaluator
├── devices/
│   ├── rover/rover_esp32.ino             # Main Rover ESP32 Firmware
│   ├── irrigation/irrigation_esp32.ino   # NodeMCU ESP8266 Irrigation Firmware
│   └── esp32_cam/camera_esp32_cam.ino    # ESP32-CAM JPEG Stream & Upload Firmware
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx             # Main Smart Farming Dashboard
│   │   ├── rover/page.tsx       # Rover Command Center & Sensor Grid
│   │   ├── irrigation/page.tsx  # Irrigation Controls & Telemetry
│   │   ├── ai-analysis/page.tsx # Pathology Analysis History & Reports
│   │   └── layout.tsx           # Navigation Shell & Language Selector
│   ├── src/components/
│   │   ├── LiveCameraFeed.tsx   # Live Stream & Interactive ROI Selector
│   │   └── LanguageSelector.tsx # Multi-Language Dropdown Component
│   └── src/context/
│       └── LanguageContext.tsx  # Dynamic Language Context (English + 8 Indian Languages)
└── README.md
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

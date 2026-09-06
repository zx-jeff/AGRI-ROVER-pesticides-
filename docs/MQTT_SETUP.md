# MQTT Topic Configuration Guide

The Smart Farming Assistant communicates with ESP32 microcontrollers using device-specific MQTT topics over standard TCP/TLS port 1883/8883.

## Topics Schema

### Rover Telemetry & Command
- `farm/rover/{rover_id}/command`: Directional pad commands (`FORWARD`, `REVERSE`, `LEFT`, `RIGHT`, `STOP`, `AUTO`, `MANUAL`, `EMERGENCY_STOP`)
- `farm/rover/{rover_id}/telemetry`: Heartbeat JSON (`rover_id`, `mode`, `status`, `battery`, `obstacle_distance`)
- `farm/rover/{rover_id}/ack`: Command receipt & execution status (`RECEIVED`, `EXECUTING`, `COMPLETED`)

### ESP32-CAM Status
- `farm/camera/{camera_id}/status`: Camera node status and streaming resolution telemetry

### ESP32 Irrigation & Spray Pumps
- `farm/irrigation/{device_id}/command`: Pump activation commands (`SPRAY_PUMP1_3`, `SPRAY_PUMP2_4`, `START_IRRIGATION_30`, `EMERGENCY_STOP`)
- `farm/irrigation/{device_id}/telemetry`: Soil moisture ADC and rain sensor status
- `farm/irrigation/{device_id}/ack`: Pump pulse completion acknowledgements

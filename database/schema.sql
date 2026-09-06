-- AI-Powered Smart Farming Assistant SQL Schema
-- Compatible with Supabase PostgreSQL & SQLite

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Farmer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rovers (
    id SERIAL PRIMARY KEY,
    rover_id VARCHAR(50) UNIQUE NOT NULL,
    mode VARCHAR(50) DEFAULT 'MANUAL',
    battery FLOAT DEFAULT 100.0,
    obstacle_distance FLOAT DEFAULT 150.0,
    row_index INT DEFAULT 1,
    position_x FLOAT DEFAULT 0.0,
    position_y FLOAT DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'IDLE',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plant_inspections (
    id SERIAL PRIMARY KEY,
    inspection_code VARCHAR(100) UNIQUE NOT NULL,
    image_url TEXT,
    image_base64 TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING',
    disease VARCHAR(50) DEFAULT 'UNKNOWN',
    confidence FLOAT DEFAULT 0.0,
    treatment_decision VARCHAR(50) DEFAULT 'NO_SPRAY',
    tank_used VARCHAR(50),
    pump_used VARCHAR(50),
    spray_duration FLOAT DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id SERIAL PRIMARY KEY,
    inspection_id INT REFERENCES plant_inspections(id),
    raw_response TEXT,
    disease_detected VARCHAR(50),
    confidence_score FLOAT,
    recommended_action TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS treatment_configs (
    id SERIAL PRIMARY KEY,
    disease_name VARCHAR(50) UNIQUE NOT NULL,
    tank_id VARCHAR(50) NOT NULL,
    pump_id VARCHAR(50) NOT NULL,
    duration_sec FLOAT DEFAULT 3.0,
    enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS treatments (
    id SERIAL PRIMARY KEY,
    inspection_id INT REFERENCES plant_inspections(id),
    disease_name VARCHAR(50),
    tank_id VARCHAR(50),
    pump_id VARCHAR(50),
    duration_sec FLOAT,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL PRIMARY KEY,
    temperature FLOAT,
    humidity FLOAT,
    soil_moisture FLOAT,
    rain_detected BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS irrigation_schedules (
    id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100),
    time_of_day VARCHAR(20),
    duration_min INT DEFAULT 10,
    min_soil_moisture FLOAT DEFAULT 70.0,
    suppress_if_rain BOOLEAN DEFAULT TRUE,
    enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS irrigation_events (
    id SERIAL PRIMARY KEY,
    schedule_id INT REFERENCES irrigation_schedules(id),
    zone_name VARCHAR(100),
    trigger_type VARCHAR(50) DEFAULT 'SCHEDULED',
    status VARCHAR(50),
    duration_sec INT DEFAULT 60,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    severity VARCHAR(20),
    title VARCHAR(255),
    message TEXT,
    category VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS command_logs (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(100),
    device_id VARCHAR(50),
    command VARCHAR(100),
    status VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

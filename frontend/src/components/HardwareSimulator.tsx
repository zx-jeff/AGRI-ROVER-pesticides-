'use client';

import React, { useState } from 'react';
import {
  Bot,
  Sliders,
  CloudRain,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  ShieldAlert,
  Play,
  Pause,
  Navigation,
  Compass
} from 'lucide-react';

interface HardwareSimulatorProps {
  onRefreshDashboard?: () => void;
}

export default function HardwareSimulator({ onRefreshDashboard }: HardwareSimulatorProps) {
  const [obstacleDistance, setObstacleDistance] = useState<number>(150);
  const [soilMoisture, setSoilMoisture] = useState<number>(45);
  const [rainDetected, setRainDetected] = useState<boolean>(false);
  const [roverMode, setRoverMode] = useState<string>('MANUAL');
  const [roverStatus, setRoverStatus] = useState<string>('IDLE');

  const handleUpdateObstacle = async (val: number) => {
    setObstacleDistance(val);
    try {
      await fetch(`http://localhost:8000/api/rover/telemetry?battery=95.0&obstacle_distance=${val}&row_index=1`, {
        method: 'POST',
      });
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSensors = async (moisture: number, rain: boolean) => {
    setSoilMoisture(moisture);
    setRainDetected(rain);
    try {
      await fetch('http://localhost:8000/api/environment/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: 28.0,
          humidity: 64.0,
          soil_moisture: moisture,
          rain_detected: rain,
        }),
      });
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoverControl = async (cmd: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/rover/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rover_mode) setRoverMode(data.rover_mode);
        if (data.rover_status) setRoverStatus(data.rover_status);
        if (onRefreshDashboard) onRefreshDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isEmergency = roverMode === 'EMERGENCY_STOP';

  return (
    <div className="card p-6 shadow-card relative overflow-hidden space-y-5">
      <div className="flex items-center justify-between border-b border-surface-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
            <Bot className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="font-bold text-surface-800 text-base">Rover Control & Telemetry</h2>
            <p className="text-xs text-surface-500">Movement, obstacle sensors & smart irrigation safety</p>
          </div>
        </div>
        <span className="px-3 py-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold rounded-full font-mono">
          {roverMode}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Column 1: Directional Rover Control DPAD */}
        <div className="space-y-4 bg-surface-50 p-4 rounded-xl border border-surface-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-surface-700 uppercase tracking-wider mb-3">
              <span className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-brand-500" />
                Rover Movement
              </span>
            </div>

            {/* Mode selection buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => handleRoverControl('MANUAL')}
                className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                  roverMode === 'MANUAL'
                    ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                    : 'bg-white border-surface-200 text-surface-500 hover:text-surface-700 hover:border-surface-300'
                }`}
              >
                MANUAL
              </button>
              <button
                onClick={() => handleRoverControl('AUTO')}
                className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                  roverMode === 'AUTO'
                    ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                    : 'bg-white border-surface-200 text-surface-500 hover:text-surface-700 hover:border-surface-300'
                }`}
              >
                AUTO
              </button>
              <button
                onClick={() => handleRoverControl('PAUSED')}
                className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                  roverMode === 'PAUSED'
                    ? 'bg-warm-50 border-warm-300 text-warm-700 shadow-sm'
                    : 'bg-white border-surface-200 text-surface-500 hover:text-surface-700 hover:border-surface-300'
                }`}
              >
                PAUSE
              </button>
            </div>

            {/* Directional Pad */}
            <div className="flex flex-col items-center gap-2 py-4 bg-white rounded-xl border border-surface-200">
              <button
                onClick={() => handleRoverControl('FORWARD')}
                disabled={isEmergency}
                className="p-3 bg-surface-50 hover:bg-brand-50 hover:border-brand-300 text-surface-700 rounded-xl border border-surface-200 transition-all duration-200 disabled:opacity-30"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleRoverControl('LEFT')}
                  disabled={isEmergency}
                  className="p-3 bg-surface-50 hover:bg-brand-50 hover:border-brand-300 text-surface-700 rounded-xl border border-surface-200 transition-all duration-200 disabled:opacity-30"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRoverControl('STOP')}
                  className="p-3 bg-rose-500 hover:bg-rose-400 text-white rounded-xl border border-rose-400 transition-all duration-200 shadow-lg shadow-rose-500/25"
                >
                  <Square className="w-5 h-5 fill-white" />
                </button>
                <button
                  onClick={() => handleRoverControl('RIGHT')}
                  disabled={isEmergency}
                  className="p-3 bg-surface-50 hover:bg-brand-50 hover:border-brand-300 text-surface-700 rounded-xl border border-surface-200 transition-all duration-200 disabled:opacity-30"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => handleRoverControl('REVERSE')}
                disabled={isEmergency}
                className="p-3 bg-surface-50 hover:bg-brand-50 hover:border-brand-300 text-surface-700 rounded-xl border border-surface-200 transition-all duration-200 disabled:opacity-30"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>



        {/* Column 3: Emergency Cutoff & Telemetry Status */}
        <div className="space-y-4 bg-surface-50 p-4 rounded-xl border border-surface-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-surface-700 uppercase tracking-wider mb-4">
              <span className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-warm-500" />
                Safety Status
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-surface-200 flex justify-between items-center">
                <span className="text-surface-500 font-medium">Rover Mode:</span>
                <span className="font-mono font-bold text-brand-700">{roverMode}</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-surface-200 flex justify-between items-center">
                <span className="text-surface-500 font-medium">Movement:</span>
                <span className="font-mono font-bold text-surface-700">{roverStatus}</span>
              </div>

              <div className={`p-3.5 rounded-xl border font-bold text-xs ${
                obstacleDistance < 20
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-brand-50 border-brand-200 text-brand-700'
              }`}>
                {obstacleDistance < 20 ? '⚠️ OBSTACLE STOP ENGAGED' : '✅ CLEAR NAVIGATION PATH'}
              </div>
            </div>
          </div>

          {/* Emergency Stop Action Button */}
          <div>
            {isEmergency ? (
              <button
                onClick={() => handleRoverControl('RESET')}
                className="w-full py-3 btn-primary text-xs"
              >
                RESET EMERGENCY STOP
              </button>
            ) : (
              <button
                onClick={() => handleRoverControl('EMERGENCY_STOP')}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25"
              >
                <ShieldAlert className="w-4 h-4" />
                EMERGENCY STOP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  Bot,
  Compass,
  Zap,
  AlertTriangle,
  Play,
  Pause,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Activity,
  Droplets,
  MapPin,
  Eye,
  Radio
} from 'lucide-react';

export default function RoverPage() {
  const { t } = useLanguage();
  const [roverState, setRoverState] = useState<any>({
    mode: 'MANUAL',
    state: 'IDLE',
    ir_detected: false,
    obstacle_detected: false,
    front_left_distance_cm: -1,
    front_right_distance_cm: -1,
    tank1_level_percent: 85.0,
    tank2_level_percent: 90.0,
    pump1: false,
    pump2: false,
    gps_valid: false,
    latitude: 0.0,
    longitude: 0.0,
    emergency_stop: false
  });

  const fetchRoverStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/rover/status');
      if (res.ok) {
        const data = await res.json();
        setRoverState(data);
      }
    } catch (e) {
      console.error('Failed to fetch rover status', e);
    }
  };

  useEffect(() => {
    fetchRoverStatus();
    const interval = setInterval(fetchRoverStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const sendCommand = async (cmd: string, durationMs?: number) => {
    try {
      const payload: any = { command: cmd };
      if (durationMs) payload.duration_ms = durationMs;

      const res = await fetch('http://localhost:8000/api/rover/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) fetchRoverStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const isEmergency = roverState.emergency_stop || roverState.mode === 'EMERGENCY_STOP';

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">{t('navRoverControl')}</h1>
          <p className="text-xs text-surface-500 font-medium mt-1">
            Real-time telemetry, L298N motor drivers, dual ultrasonic sensors & chemical sprayers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEmergency ? (
            <button
              onClick={() => sendCommand('RESET_EMERGENCY_STOP')}
              className="px-5 py-2.5 btn-primary text-xs font-extrabold"
            >
              {t('resetEmergency')}
            </button>
          ) : (
            <button
              onClick={() => sendCommand('EMERGENCY_STOP')}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs rounded-xl transition-all duration-200 shadow-lg shadow-rose-500/25 flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              {t('emergencyStop')}
            </button>
          )}
        </div>
      </div>

      {/* Grid: Map & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Telemetry Sensors & Tank Monitors */}
        <div className="card p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-surface-100 pb-3">
            <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                <Compass className="w-3.5 h-3.5 text-brand-600" />
              </div>
              Rover Telemetry Sensors
            </h2>
            <span className="text-xs font-mono text-brand-600 font-bold bg-brand-50 px-3 py-1 rounded-lg border border-brand-200 flex items-center gap-1.5">
              <Radio className="w-3 h-3 animate-pulse text-brand-500" />
              State: {roverState.state || 'IDLE'}
            </span>
          </div>



          {/* Chemical Tank Level Gauges */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-surface-700 tracking-tight uppercase flex items-center gap-2">
              <Droplets className="w-4 h-4 text-accent-500" />
              Treatment Chemical Tank Monitoring (Ultrasonic)
            </h3>

            {/* Tank 1 */}
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-surface-700">Tank 1 Level (GPIO 21/22, Pump GPIO 32)</span>
                <span className={`font-extrabold ${roverState.tank1_level_percent < 15 ? 'text-rose-600' : 'text-accent-600'}`}>
                  {roverState.tank1_level_percent >= 0 ? `${roverState.tank1_level_percent.toFixed(1)}%` : 'UNKNOWN'}
                </span>
              </div>
              <div className="w-full bg-surface-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${roverState.tank1_level_percent < 15 ? 'bg-rose-500' : 'bg-accent-500'}`}
                  style={{ width: `${Math.max(0, Math.min(100, roverState.tank1_level_percent || 0))}%` }}
                />
              </div>
            </div>

            {/* Tank 2 */}
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-surface-700">Tank 2 Level (GPIO 23/25, Pump GPIO 33)</span>
                <span className={`font-extrabold ${roverState.tank2_level_percent < 15 ? 'text-rose-600' : 'text-brand-600'}`}>
                  {roverState.tank2_level_percent >= 0 ? `${roverState.tank2_level_percent.toFixed(1)}%` : 'UNKNOWN'}
                </span>
              </div>
              <div className="w-full bg-surface-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${roverState.tank2_level_percent < 15 ? 'bg-rose-500' : 'bg-brand-500'}`}
                  style={{ width: `${Math.max(0, Math.min(100, roverState.tank2_level_percent || 0))}%` }}
                />
              </div>
            </div>
          </div>

          {/* IR & GPS Status Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 flex items-center justify-between">
              <span className="text-surface-500 font-medium flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-brand-500" /> IR Plant Sensor (GPIO 34)
              </span>
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${roverState.ir_detected ? 'bg-brand-100 text-brand-700' : 'bg-surface-200 text-surface-600'}`}>
                {roverState.ir_detected ? 'PLANT DETECTED' : 'CLEAR'}
              </span>
            </div>

            <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 flex items-center justify-between">
              <span className="text-surface-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent-500" /> NEO-6M GPS (GPIO 4/5)
              </span>
              <span className="font-bold text-surface-800">
                {roverState.gps_valid ? `${roverState.latitude?.toFixed(4)}, ${roverState.longitude?.toFixed(4)}` : 'SEARCHING FIX'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Firmware Command Directional Pad & Pump Controls */}
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-warm-50 border border-warm-200 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-warm-600" />
              </div>
              Firmware Control Panel
            </h2>

            {/* Mode selector buttons */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <button
                onClick={() => sendCommand('MANUAL_MODE')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  roverState.mode === 'MANUAL'
                    ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                    : 'bg-white border-surface-200 text-surface-500 hover:text-surface-700'
                }`}
              >
                MANUAL
              </button>
              <button
                onClick={() => sendCommand('AUTO_MODE')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  roverState.mode === 'AUTO'
                    ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                    : 'bg-white border-surface-200 text-surface-500 hover:text-surface-700'
                }`}
              >
                AUTO
              </button>
              <button
                onClick={() => sendCommand('PAUSE')}
                className="py-2.5 rounded-xl text-xs font-bold border bg-white border-surface-200 text-surface-600 hover:bg-surface-100"
              >
                PAUSE
              </button>
            </div>

            {/* Directional Pad */}
            <div className="flex flex-col items-center gap-3 py-5 bg-surface-50 rounded-xl border border-surface-200">
              <button
                onClick={() => sendCommand('FORWARD')}
                disabled={isEmergency}
                className="p-4 bg-white hover:bg-brand-50 hover:border-brand-300 text-surface-700 rounded-xl border border-surface-200 transition-all duration-200 disabled:opacity-30 shadow-sm"
                title="FORWARD"
              >
                <ArrowUp className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-6">
                <button
                  onClick={() => sendCommand('LEFT')}
                  disabled={isEmergency}
                  className="p-4 bg-white hover:bg-brand-50 hover:border-brand-300 text-surface-700 rounded-xl border border-surface-200 transition-all duration-200 disabled:opacity-30 shadow-sm"
                  title="LEFT"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => sendCommand('STOP')}
                  className="p-4 bg-rose-500 hover:bg-rose-400 text-white rounded-xl border border-rose-400 transition-all duration-200 shadow-lg shadow-rose-500/25"
                  title="STOP"
                >
                  <Square className="w-6 h-6 fill-white" />
                </button>
                <button
                  onClick={() => sendCommand('RIGHT')}
                  disabled={isEmergency}
                  className="p-4 bg-white hover:bg-brand-50 hover:border-brand-300 text-surface-700 rounded-xl border border-surface-200 transition-all duration-200 disabled:opacity-30 shadow-sm"
                  title="RIGHT"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>

              <button
                onClick={() => sendCommand('BACKWARD')}
                disabled={isEmergency}
                className="p-4 bg-white hover:bg-brand-50 hover:border-brand-300 text-surface-700 rounded-xl border border-surface-200 transition-all duration-200 disabled:opacity-30 shadow-sm"
                title="BACKWARD"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Treatment Chemical Sprayer Buttons */}
          <div className="space-y-2 pt-2 border-t border-surface-200">
            <h3 className="text-xs font-bold text-surface-700 uppercase tracking-tight">Manual Treatment Pumps</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendCommand('TREAT_PUMP1', 5000)}
                disabled={isEmergency}
                className="py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-30"
              >
                SPRAY TANK 1 (5s)
              </button>
              <button
                onClick={() => sendCommand('TREAT_PUMP2', 5000)}
                disabled={isEmergency}
                className="py-2.5 px-3 bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-30"
              >
                SPRAY TANK 2 (5s)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

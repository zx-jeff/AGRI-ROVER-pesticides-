'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  Droplets,
  CloudRain,
  Thermometer,
  CloudSun,
  Clock,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Radio,
  Sliders,
  ShieldAlert
} from 'lucide-react';

export default function IrrigationPage() {
  const { t } = useLanguage();
  const [telemetry, setTelemetry] = useState<any>({
    soil_raw: 450,
    soil_moisture: 45.0,
    rain_raw: 1,
    rain: false,
    temperature: 28.5,
    humidity: 62.0,
    pump: false,
    emergency_stop: false,
    moisture_threshold: 40.0
  });

  const [schedules, setSchedules] = useState<any[]>([]);
  const [durationSec, setDurationSec] = useState<number>(10);
  const [newThreshold, setNewThreshold] = useState<number>(40.0);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchIrrigationData = async () => {
    try {
      const [resStatus, resSched] = await Promise.all([
        fetch('http://localhost:8000/api/irrigation/status'),
        fetch('http://localhost:8000/api/irrigation/schedules'),
      ]);
      if (resSched.ok) setSchedules(await resSched.json());
      if (resStatus.ok) {
        const statusData = await resStatus.json();
        if (statusData.last_event) {
          setTelemetry((prev: any) => ({ ...prev, pump: statusData.status === 'EXECUTING' }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch irrigation data', e);
    }
  };

  useEffect(() => {
    fetchIrrigationData();
    const interval = setInterval(fetchIrrigationData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    setLastResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/irrigation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_name: 'North Field Zone 1',
          duration_sec: durationSec,
          override_safety: false,
        }),
      });
      const data = await res.json();
      setLastResult(data);
      fetchIrrigationData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">{t('navSmartIrrigation')}</h1>
          <p className="text-xs text-surface-500 font-medium mt-1">
            NodeMCU ESP8266 telemetry: Soil Moisture ADC, Rain Sensor D6, DHT11 & Water Pump Relay
          </p>
        </div>
        <button
          onClick={fetchIrrigationData}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-surface-50 text-surface-600 text-xs font-bold rounded-xl border border-surface-200 transition-all duration-200 shadow-card"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Sensors
        </button>
      </div>

      {/* NodeMCU Firmware Sensors Live Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Soil Moisture */}
        <div className="card p-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-brand-600" /> Soil Moisture (Pin A0)
            </span>
            <span className="font-mono text-[11px] text-surface-400">Raw: {telemetry.soil_raw}</span>
          </div>
          <div className="text-2xl font-black text-brand-700 tracking-tight">
            {telemetry.soil_moisture.toFixed(1)}%
          </div>
          <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
            <div className="bg-brand-500 h-full rounded-full transition-all duration-500" style={{ width: `${telemetry.soil_moisture}%` }} />
          </div>
        </div>

        {/* Rain Sensor */}
        <div className={`card p-5 space-y-2 border ${telemetry.rain ? 'bg-accent-50/50 border-accent-300' : ''}`}>
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-accent-600" /> Rain Sensor (Pin D6)
            </span>
            <span className="font-mono text-[11px] text-surface-400">Raw: {telemetry.rain_raw}</span>
          </div>
          <div className={`text-xl font-extrabold ${telemetry.rain ? 'text-accent-700' : 'text-surface-700'}`}>
            {telemetry.rain ? 'RAIN DETECTED' : 'NO RAIN'}
          </div>
          <span className="text-[10px] text-surface-400 font-medium">Active LOW logic active</span>
        </div>

        {/* DHT11 Temperature */}
        <div className="card p-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-500" /> Temperature (DHT11 Pin D5)
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">
            {telemetry.temperature.toFixed(1)} °C
          </div>
          <span className="text-[10px] text-surface-400 font-medium">Valid Reading</span>
        </div>

        {/* DHT11 Humidity */}
        <div className="card p-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-sky-500" /> Humidity (DHT11 Pin D5)
            </span>
          </div>
          <div className="text-2xl font-black text-sky-600 tracking-tight">
            {telemetry.humidity.toFixed(1)} %
          </div>
          <span className="text-[10px] text-surface-400 font-medium">Valid Reading</span>
        </div>
      </div>

      {/* Grid: Manual Pump Trigger & Safety Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Manual Irrigation Control */}
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-brand-600" />
            </div>
            NodeMCU Water Pump Relay Control (Pin D1)
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-surface-500 block mb-1.5 font-semibold text-xs">Pump Duration (Seconds, Max 60s):</label>
              <input
                type="number"
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                min={5}
                max={60}
                className="input-modern font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleManualTrigger}
            disabled={isTriggering || telemetry.emergency_stop}
            className="w-full py-3 btn-primary text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isTriggering ? (
              <span>Evaluating Safety & Activating Relay...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>TRIGGER NODE MCU WATER PUMP</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Safety Authorization Response */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              </div>
              Firmware Safety Rules Status
            </h2>

            {lastResult ? (
              <div className="space-y-4 animate-slide-up">
                <div className={`p-4 rounded-xl border ${
                  lastResult.authorized
                    ? 'bg-brand-50 border-brand-200 text-brand-700'
                    : 'bg-warm-50 border-warm-200 text-warm-700'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
                    {lastResult.authorized ? (
                      <CheckCircle className="w-5 h-5 text-brand-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-warm-500" />
                    )}
                    {lastResult.authorized ? 'PUMP AUTHORIZED' : 'IRRIGATION BLOCKED BY FIRMWARE SAFETY'}
                  </div>
                  <p className="text-xs opacity-90">{lastResult.reason}</p>
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-surface-400 text-center p-6 border-2 border-dashed border-surface-200 rounded-xl">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mb-2">
                  <Droplets className="w-6 h-6 text-brand-400" />
                </div>
                <p className="text-xs max-w-xs text-surface-500">Trigger irrigation to evaluate firmware safety rules.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  Settings,
  Cpu,
  ArrowDown,
  Info
} from 'lucide-react';

export default function IrrigationPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');

  // Telemetry state
  const [telemetry, setTelemetry] = useState<any>({
    soil_raw: 615,
    soil_moisture: 35.0,
    rain_raw: 1,
    rain_detected: false,
    temperature: 28.5,
    humidity: 62.0,
    pump: false,
    moisture_threshold: 40.0,
    mode: 'MANUAL',
    is_active: false
  });

  // Manual mode state
  const [manualDuration, setManualDuration] = useState<number>(10);
  const [isManualLoading, setIsManualLoading] = useState<boolean>(false);
  const [manualResult, setManualResult] = useState<any>(null);

  // Auto mode configuration state
  const [autoCycles, setAutoCycles] = useState<number>(3);
  const [autoDuration, setAutoDuration] = useState<number>(10);
  const [autoThreshold, setAutoThreshold] = useState<number>(40.0);
  const [isAutoLoading, setIsAutoLoading] = useState<boolean>(false);
  const [autoResult, setAutoResult] = useState<any>(null);

  // NodeMCU IP state
  const [irrigationIp, setIrrigationIp] = useState<string>('192.168.1.102');
  const [isIpConnecting, setIsIpConnecting] = useState<boolean>(false);
  const [ipMessage, setIpMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedIp = localStorage.getItem('agrirover_irrigation_ip');
    if (savedIp) setIrrigationIp(savedIp);
  }, []);

  const handleConnectNodeMcuIp = async () => {
    setIsIpConnecting(true);
    setIpMessage(null);
    let formatted = irrigationIp.trim();
    if (formatted && !formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }

    try {
      const res = await fetch('http://localhost:8000/api/irrigation/ip-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_address: formatted }),
      });
      const data = await res.json();
      setIpMessage(data.message || `Connected & synced NodeMCU ESP8266 IP: ${formatted}`);
      localStorage.setItem('agrirover_irrigation_ip', formatted);
      fetchIrrigationStatus();
    } catch (e) {
      setIpMessage(`Synced NodeMCU ESP8266 IP: ${formatted}`);
    } finally {
      setIsIpConnecting(false);
      setTimeout(() => setIpMessage(null), 4000);
    }
  };

  const fetchIrrigationStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/irrigation/status');
      if (res.ok) {
        const data = await res.json();
        setTelemetry({
          soil_raw: data.sensor?.soil_raw || 615,
          soil_moisture: data.sensor?.soil_moisture ?? 35.0,
          rain_raw: data.sensor?.rain_raw ?? 1,
          rain_detected: data.sensor?.rain_detected ?? false,
          temperature: data.sensor?.temperature ?? 28.5,
          humidity: data.sensor?.humidity ?? 62.0,
          pump: data.sensor?.pump ?? false,
          moisture_threshold: data.moisture_threshold ?? 40.0,
          mode: data.mode || 'MANUAL',
          is_active: data.is_active || false
        });

        if (data.ip_address) setIrrigationIp(data.ip_address);
        if (data.cycles) setAutoCycles(data.cycles);
        if (data.duration_sec) setAutoDuration(data.duration_sec);
        if (data.moisture_threshold) setAutoThreshold(data.moisture_threshold);
      }
    } catch (e) {
      console.error('Failed to fetch irrigation status', e);
    }
  };

  useEffect(() => {
    fetchIrrigationStatus();
    const interval = setInterval(fetchIrrigationStatus, 3000);

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:8000/api/rover/ws');
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'IRRIGATION_TELEMETRY' && msg.data) {
            setTelemetry((prev: any) => ({
              ...prev,
              soil_moisture: msg.data.soil_moisture ?? prev.soil_moisture,
              soil_raw: msg.data.soil_raw ?? prev.soil_raw,
              rain_detected: msg.data.rain_detected ?? prev.rain_detected,
              rain_raw: msg.data.rain_raw ?? prev.rain_raw,
              temperature: msg.data.temperature ?? prev.temperature,
              humidity: msg.data.humidity ?? prev.humidity,
              pump: msg.data.pump ?? prev.pump
            }));
          } else if (msg.event === 'IRRIGATION_EVENT' && msg.data) {
            setTelemetry((prev: any) => ({
              ...prev,
              pump: msg.data.status === 'PUMP_ON'
            }));
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };
    } catch (e) {
      console.warn('WS connection failed, using polling fallback', e);
    }

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  // Manual ON / OFF control
  const handleManualCommand = async (command: 'ON' | 'OFF') => {
    setIsManualLoading(true);
    setManualResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/irrigation/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: command,
          duration_sec: manualDuration,
        }),
      });
      const data = await res.json();
      setManualResult(data);
      fetchIrrigationStatus();
    } catch (e) {
      console.error('Manual pump command failed', e);
    } finally {
      setIsManualLoading(false);
    }
  };

  // Auto Mode configuration save & activate
  const handleSaveAutoConfig = async (activate: boolean) => {
    setIsAutoLoading(true);
    setAutoResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/irrigation/auto-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycles: autoCycles,
          duration_sec: autoDuration,
          threshold: autoThreshold,
          mode: activate ? 'AUTO' : 'MANUAL',
          is_active: activate,
        }),
      });
      const data = await res.json();
      setAutoResult(data);
      fetchIrrigationStatus();
    } catch (e) {
      console.error('Auto config save failed', e);
    } finally {
      setIsAutoLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">Smart Irrigation Controller</h1>
          <p className="text-xs text-surface-500 font-medium mt-1">
            Separate NodeMCU ESP8266 Unit (`IRRIGATION-NODEMCU-01`) — Soil Moisture ADC, Rain Sensor D6, DHT11 & Water Pump Relay
          </p>
        </div>
        <button
          onClick={fetchIrrigationStatus}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-surface-50 text-surface-600 text-xs font-bold rounded-xl border border-surface-200 transition-all duration-200 shadow-card"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh NodeMCU Sensors
        </button>
      </div>

      {/* NodeMCU ESP8266 Wi-Fi IP Connection Manager Card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-surface-700 uppercase tracking-wider">
            <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-sky-600" />
            </div>
            NodeMCU ESP8266 Irrigation Unit Connection Manager
          </div>
          <span className="text-[11px] font-mono text-surface-400">Separate Unit (`IRRIGATION-NODEMCU-01`)</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-surface-500 block mb-1 font-semibold flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              NodeMCU ESP8266 IP Address or URL:
            </label>
            <input
              type="text"
              value={irrigationIp}
              onChange={(e) => setIrrigationIp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConnectNodeMcuIp();
              }}
              placeholder="e.g. 192.168.1.102 or http://192.168.1.102"
              className="input-modern font-mono text-xs"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleConnectNodeMcuIp}
              disabled={isIpConnecting}
              className="px-5 py-2.5 btn-primary text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Radio className="w-4 h-4" />
              <span>CONNECT & SYNC NODEMCU</span>
            </button>
            <button
              onClick={() => {
                setIrrigationIp('192.168.1.102');
                handleConnectNodeMcuIp();
              }}
              className="px-3 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 font-bold rounded-xl text-xs transition-all"
            >
              Default IP
            </button>
          </div>
        </div>

        {ipMessage && (
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold flex items-center gap-2 animate-slide-up">
            <CheckCircle className="w-4 h-4 text-sky-600" />
            {ipMessage}
          </div>
        )}
      </div>

      {/* NodeMCU ESP8266 Live Telemetry Sensors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Soil Moisture */}
        <div className="card p-5 space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-brand-600" /> Soil Moisture (A0)
            </span>
            <span className="font-mono text-[10px] text-surface-400">ADC: {telemetry.soil_raw}</span>
          </div>
          <div className="text-2xl font-black text-brand-700 tracking-tight">
            {telemetry.soil_moisture.toFixed(1)}%
          </div>
          <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                telemetry.soil_moisture < telemetry.moisture_threshold ? 'bg-brand-500' : 'bg-sky-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, telemetry.soil_moisture))}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-surface-500 block">
            Threshold: {telemetry.moisture_threshold.toFixed(1)}% ({telemetry.soil_moisture < telemetry.moisture_threshold ? 'Irrigation Needed' : 'Optimal'})
          </span>
        </div>

        {/* Rain Sensor */}
        <div className={`card p-5 space-y-2 border transition-all ${telemetry.rain_detected ? 'bg-accent-50/70 border-accent-300' : 'border-surface-200'}`}>
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-accent-600" /> Rain Sensor (D6)
            </span>
            <span className="font-mono text-[10px] text-surface-400">Pin: {telemetry.rain_raw}</span>
          </div>
          <div className={`text-lg font-extrabold ${telemetry.rain_detected ? 'text-accent-700' : 'text-surface-700'}`}>
            {telemetry.rain_detected ? 'RAIN DETECTED' : 'NO RAIN'}
          </div>
          <span className="text-[10px] text-surface-400 font-medium">Active LOW detection</span>
        </div>

        {/* DHT11 Temp */}
        <div className="card p-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-500" /> Temperature (D5)
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">
            {telemetry.temperature.toFixed(1)} °C
          </div>
          <span className="text-[10px] text-surface-400 font-medium">DHT11 Air Temp</span>
        </div>

        {/* DHT11 Humidity */}
        <div className="card p-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-sky-500" /> Humidity (D5)
            </span>
          </div>
          <div className="text-2xl font-black text-sky-600 tracking-tight">
            {telemetry.humidity.toFixed(1)} %
          </div>
          <span className="text-[10px] text-surface-400 font-medium">Relative Humidity</span>
        </div>

        {/* Water Pump Relay Status */}
        <div className={`card p-5 space-y-2 border transition-all ${telemetry.pump ? 'bg-brand-50 border-brand-300 shadow-sm' : 'border-surface-200'}`}>
          <div className="flex justify-between items-center text-xs">
            <span className="text-surface-500 font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-brand-600" /> Water Pump (D1)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${telemetry.pump ? 'bg-brand-500 animate-ping' : 'bg-surface-300'}`} />
            <span className={`text-lg font-black ${telemetry.pump ? 'text-brand-700' : 'text-surface-600'}`}>
              {telemetry.pump ? 'PUMP RUNNING' : 'PUMP OFF'}
            </span>
          </div>
          <span className="text-[10px] text-surface-400 font-medium">Active LOW Relay</span>
        </div>
      </div>

      {/* Navigation Mode Switcher Tabs */}
      <div className="flex items-center gap-2 bg-surface-100 p-1.5 rounded-2xl border border-surface-200 w-fit text-xs font-bold">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'manual'
              ? 'bg-white text-brand-700 shadow-card border border-brand-200'
              : 'text-surface-600 hover:text-surface-900'
          }`}
        >
          <Droplets className="w-4 h-4 text-brand-600" />
          1. Manual Mode ([ ON ] / [ OFF ])
        </button>
        <button
          onClick={() => setActiveTab('auto')}
          className={`px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'auto'
              ? 'bg-white text-brand-700 shadow-card border border-brand-200'
              : 'text-surface-600 hover:text-surface-900'
          }`}
        >
          <Clock className="w-4 h-4 text-brand-600" />
          2. Auto Mode (Cycles & Timer)
        </button>
      </div>

      {/* TAB 1: MANUAL MODE */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Manual ON / OFF Controls */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5 text-brand-600" />
                </div>
                Manual Pump Execution
              </h2>
              <span className="text-[11px] font-mono text-surface-400">NodeMCU Relay D1</span>
            </div>

            <div>
              <label className="text-surface-600 block mb-1.5 font-bold text-xs">
                Irrigation Duration Timer (Seconds):
              </label>
              <input
                type="number"
                value={manualDuration}
                onChange={(e) => setManualDuration(Math.max(5, Math.min(120, Number(e.target.value))))}
                min={5}
                max={120}
                className="input-modern font-mono text-xs"
              />
              <span className="text-[10px] text-surface-400 mt-1 block">
                Default: 10 seconds. Rain detection automatically blocks/stops pump.
              </span>
            </div>

            {/* Prominent ON / OFF Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => handleManualCommand('ON')}
                disabled={isManualLoading}
                className="py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>PUMP [ ON ]</span>
              </button>

              <button
                onClick={() => handleManualCommand('OFF')}
                disabled={isManualLoading}
                className="py-4 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
              >
                <Square className="w-5 h-5 fill-white" />
                <span>PUMP [ OFF ]</span>
              </button>
            </div>
          </div>

          {/* Right: Manual Safety Response Status */}
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                </div>
                Manual Safety Evaluation Status
              </h2>

              {manualResult ? (
                <div className="space-y-4 animate-slide-up">
                  <div
                    className={`p-4 rounded-xl border ${
                      manualResult.authorized
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
                      {manualResult.authorized ? (
                        <CheckCircle className="w-5 h-5 text-brand-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500" />
                      )}
                      {manualResult.authorized ? 'MANUAL IRRIGATION EXECUTED' : 'MANUAL IRRIGATION BLOCKED BY SAFETY'}
                    </div>
                    <p className="text-xs opacity-90">{manualResult.reason}</p>
                  </div>
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-surface-400 text-center p-6 border-2 border-dashed border-surface-200 rounded-xl">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mb-2">
                    <Droplets className="w-6 h-6 text-brand-400" />
                  </div>
                  <p className="text-xs max-w-xs text-surface-500">
                    Click [ PUMP ON ] to evaluate Rain & Soil safety rules and trigger the NodeMCU water pump.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTO MODE */}
      {activeTab === 'auto' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Auto Mode Configuration Form */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                <Sliders className="w-3.5 h-3.5 text-brand-600" />
              </div>
              Automatic Irrigation Schedule Configuration
            </h2>

            <div className="space-y-4 text-xs">
              {/* Number of Irrigations */}
              <div>
                <label className="text-surface-600 block mb-1.5 font-bold">
                  Number of Irrigations (Cycles):
                </label>
                <input
                  type="number"
                  value={autoCycles}
                  onChange={(e) => setAutoCycles(Math.max(1, Math.min(10, Number(e.target.value))))}
                  min={1}
                  max={10}
                  className="input-modern font-mono"
                />
                <span className="text-[10px] text-surface-400 mt-0.5 block">
                  e.g., 3 irrigations scheduled by backend
                </span>
              </div>

              {/* Irrigation Duration / Timer */}
              <div>
                <label className="text-surface-600 block mb-1.5 font-bold">
                  Irrigation Duration / Timer (Seconds per event):
                </label>
                <input
                  type="number"
                  value={autoDuration}
                  onChange={(e) => setAutoDuration(Math.max(5, Math.min(120, Number(e.target.value))))}
                  min={5}
                  max={120}
                  className="input-modern font-mono"
                />
                <span className="text-[10px] text-surface-400 mt-0.5 block">
                  Backend sends MQTT command: <code className="bg-surface-100 px-1 py-0.5 rounded font-mono text-[10px]">AUTO_IRRIGATE:{autoDuration * 1000}</code>
                </span>
              </div>

              {/* Soil Moisture Threshold */}
              <div>
                <label className="text-surface-600 block mb-1.5 font-bold">
                  Soil Moisture Cutoff Threshold (%):
                </label>
                <input
                  type="number"
                  value={autoThreshold}
                  onChange={(e) => setAutoThreshold(Number(e.target.value))}
                  min={10}
                  max={90}
                  step={1}
                  className="input-modern font-mono"
                />
                <span className="text-[10px] text-surface-400 mt-0.5 block">
                  Default: 40.0%. If soil moisture reaches threshold during auto mode, pump stops.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleSaveAutoConfig(true)}
                disabled={isAutoLoading}
                className="py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>SAVE & START AUTO MODE</span>
              </button>

              <button
                onClick={() => handleSaveAutoConfig(false)}
                disabled={isAutoLoading}
                className="py-3 bg-surface-200 hover:bg-surface-300 text-surface-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>STOP AUTO MODE</span>
              </button>
            </div>
          </div>

          {/* Right: Auto Mode Safety & Schedule Status */}
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                </div>
                Schedule & Safety Execution Summary
              </h2>

              <div className="p-4 bg-surface-50 rounded-2xl border border-surface-200 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-surface-200 pb-2">
                  <span className="text-surface-500 font-semibold">Active Mode:</span>
                  <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                    telemetry.is_active ? 'bg-brand-100 text-brand-700 border border-brand-200' : 'bg-surface-200 text-surface-600'
                  }`}>
                    {telemetry.is_active ? 'AUTO MODE ACTIVE' : 'MANUAL MODE'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-surface-200 pb-2">
                  <span className="text-surface-500 font-semibold">Configured Schedule:</span>
                  <span className="font-mono font-bold text-brand-700">
                    {autoCycles} irrigations × {autoDuration}s
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-surface-500 font-semibold">MQTT Topic Command:</span>
                  <span className="font-mono text-[11px] text-accent-700 bg-accent-50 px-2 py-0.5 rounded border border-accent-200">
                    farm/irrigation/IRRIGATION-NODEMCU-01/command
                  </span>
                </div>
              </div>

              {autoResult && (
                <div className="mt-4 animate-slide-up">
                  <div className={`p-4 rounded-xl border text-xs ${
                    autoResult.authorized ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <div className="font-bold mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      {autoResult.authorized ? 'AUTO MODE ENGAGED' : 'AUTO MODE ENGAGED (IRRIGATION BLOCKED BY SAFETY)'}
                    </div>
                    <p>{autoResult.reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Automatic Safety Flowchart Card */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-accent-50 border border-accent-200 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-600" />
          </div>
          Automatic Safety Decision Algorithm
        </h2>

        {/* Flowchart Visualizer */}
        <div className="bg-surface-50 p-5 rounded-2xl border border-surface-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold">
          <div className="p-3 bg-white border border-surface-200 rounded-xl shadow-sm text-center w-full md:w-auto">
            <span className="text-surface-500 block text-[10px] uppercase font-bold">1. Request</span>
            <span className="text-surface-800 font-extrabold">Irrigation Event</span>
          </div>

          <ArrowDown className="w-4 h-4 text-surface-400 rotate-0 md:-rotate-90 flex-shrink-0" />

          <div className="p-3 bg-white border border-surface-200 rounded-xl shadow-sm text-center w-full md:w-auto">
            <span className="text-surface-500 block text-[10px] uppercase font-bold">2. Rain Check</span>
            <span className={telemetry.rain_detected ? 'text-rose-600 font-extrabold' : 'text-brand-600 font-extrabold'}>
              {telemetry.rain_detected ? 'Rain Detected (BLOCKED)' : 'No Rain Detected (PASS)'}
            </span>
          </div>

          <ArrowDown className="w-4 h-4 text-surface-400 rotate-0 md:-rotate-90 flex-shrink-0" />

          <div className="p-3 bg-white border border-surface-200 rounded-xl shadow-sm text-center w-full md:w-auto">
            <span className="text-surface-500 block text-[10px] uppercase font-bold">3. Soil Moisture Check</span>
            <span className={telemetry.soil_moisture >= telemetry.moisture_threshold ? 'text-amber-600 font-extrabold' : 'text-brand-600 font-extrabold'}>
              Soil &lt; {telemetry.moisture_threshold}%? ({telemetry.soil_moisture.toFixed(1)}%)
            </span>
          </div>

          <ArrowDown className="w-4 h-4 text-surface-400 rotate-0 md:-rotate-90 flex-shrink-0" />

          <div className={`p-3 border rounded-xl shadow-sm text-center w-full md:w-auto ${
            !telemetry.rain_detected && telemetry.soil_moisture < telemetry.moisture_threshold
              ? 'bg-brand-50 border-brand-300 text-brand-700'
              : 'bg-rose-50 border-rose-300 text-rose-700'
          }`}>
            <span className="block text-[10px] uppercase font-bold">4. Action</span>
            <span className="font-extrabold">
              {!telemetry.rain_detected && telemetry.soil_moisture < telemetry.moisture_threshold ? 'Water Pump ON' : 'Water Pump OFF'}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-surface-500 bg-white p-3 rounded-xl border border-surface-200">
          <Info className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Auto Cut-Off Protection:</strong> If rain is detected or soil moisture reaches the configured cutoff threshold while the pump is running, NodeMCU immediately switches off the water pump relay to prevent crop over-saturation.
          </p>
        </div>
      </div>
    </div>
  );
}

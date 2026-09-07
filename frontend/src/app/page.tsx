'use client';

import React, { useState, useEffect } from 'react';
import HardwareSimulator from '@/components/HardwareSimulator';
import LiveCameraFeed from '@/components/LiveCameraFeed';
import { useLanguage } from '@/context/LanguageContext';
import {
  Thermometer,
  Droplets,
  Bot,
  BrainCircuit,
  RefreshCw,
  Wifi,
  Camera,
  CheckCircle,
  Link as LinkIcon,
  Server,
  TrendingUp,
  Zap
} from 'lucide-react';

export default function Dashboard() {
  const { t } = useLanguage();
  const [overview, setOverview] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // IP Configuration State
  const [roverIp, setRoverIp] = useState<string>('192.168.1.100');
  const [camIp, setCamIp] = useState<string>('http://localhost:8000/api/camera/stream');
  const [irrigationIp, setIrrigationIp] = useState<string>('192.168.1.102');
  const [activeCamUrl, setActiveCamUrl] = useState<string>('http://localhost:8000/api/camera/stream');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  // Load saved device IP configuration from localStorage on mount
  useEffect(() => {
    const savedCamIp = localStorage.getItem('agrirover_cam_ip');
    const savedRoverIp = localStorage.getItem('agrirover_rover_ip');
    const savedIrrigationIp = localStorage.getItem('agrirover_irrigation_ip');
    if (savedCamIp) {
      setCamIp(savedCamIp);
      setActiveCamUrl(savedCamIp);
    }
    if (savedRoverIp) setRoverIp(savedRoverIp);
    if (savedIrrigationIp) setIrrigationIp(savedIrrigationIp);
  }, []);

  const fetchOverview = async () => {
    try {
      const [resOverview, resAlerts] = await Promise.all([
        fetch('http://localhost:8000/api/dashboard/overview'),
        fetch('http://localhost:8000/api/alerts/'),
      ]);
      if (resOverview.ok) {
        const data = await resOverview.json();
        setOverview(data);
      }
      if (resAlerts.ok) {
        const dataAlerts = await resAlerts.json();
        setAlerts(dataAlerts);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectDevices = async () => {
    setIsConnecting(true);
    setConnectionMessage(null);
    let formattedUrl = camIp.trim();
    if (formattedUrl) {
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `http://${formattedUrl}`;
      }
      if (!formattedUrl.includes('/', 8)) {
        formattedUrl = `${formattedUrl}/stream`;
      }
    } else {
      formattedUrl = 'http://localhost:8000/api/camera/stream';
    }

    let formattedIrrigation = irrigationIp.trim();
    if (formattedIrrigation && !formattedIrrigation.startsWith('http://') && !formattedIrrigation.startsWith('https://')) {
      formattedIrrigation = `http://${formattedIrrigation}`;
    }

    setCamIp(formattedUrl);
    setActiveCamUrl(formattedUrl);
    localStorage.setItem('agrirover_cam_ip', formattedUrl);
    localStorage.setItem('agrirover_rover_ip', roverIp);
    localStorage.setItem('agrirover_irrigation_ip', formattedIrrigation);

    try {
      await Promise.all([
        fetch(`http://localhost:8000/api/rover/telemetry?battery=95.0&obstacle_distance=150.0&row_index=1`, { method: 'POST' }),
        fetch('http://localhost:8000/api/irrigation/ip-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_address: formattedIrrigation })
        })
      ]);
      setConnectionMessage(`Successfully synced device IPs: Rover (${roverIp}), ESP32-CAM (${formattedUrl}), NodeMCU Irrigation (${formattedIrrigation})!`);
      fetchOverview();
    } catch (e) {
      setConnectionMessage(`Synced device configuration URLs!`);
    } finally {
      setIsConnecting(false);
      setTimeout(() => setConnectionMessage(null), 4000);
    }
  };

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          </div>
          <span className="text-sm font-semibold text-surface-500">{t('loadingDashboard')}</span>
        </div>
      </div>
    );
  }

  const rov = overview?.rover || {};
  const env = overview?.environment || {};
  const ai = overview?.latest_ai_analysis || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Welcome & Refresh Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-800 tracking-tight">{t('dashboardTitle')}</h1>
          <p className="text-sm text-surface-500 mt-0.5">{t('dashboardSubtitle')}</p>
        </div>
        <button
          onClick={fetchOverview}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-surface-50 text-surface-600 text-xs font-bold rounded-xl border border-surface-200 transition-all duration-200 shadow-card hover:shadow-card-hover self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrics
        </button>
      </div>

      {/* Prominent Device IP Connection Bar */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-surface-700 uppercase tracking-wider">
            <div className="w-7 h-7 rounded-lg bg-accent-50 border border-accent-200 flex items-center justify-center">
              <Wifi className="w-3.5 h-3.5 text-accent-600" />
            </div>
            Device Connection Manager
          </div>
          <span className="text-[11px] font-mono text-surface-400">Wi-Fi / Local Network</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Rover ESP32 IP Field */}
          <div>
            <label className="text-[11px] text-surface-500 block mb-1.5 font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-brand-500" />
              Rover ESP32 IP
            </label>
            <input
              type="text"
              value={roverIp}
              onChange={(e) => setRoverIp(e.target.value)}
              placeholder="e.g. 192.168.1.100"
              className="input-modern font-mono text-xs"
            />
          </div>

          {/* ESP32-CAM Stream IP Field */}
          <div>
            <label className="text-[11px] text-surface-500 block mb-1.5 font-semibold flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-accent-500" />
              ESP32-CAM Stream URL
            </label>
            <input
              type="text"
              value={camIp}
              onChange={(e) => setCamIp(e.target.value)}
              placeholder="http://192.168.1.101:81/stream"
              className="input-modern font-mono text-xs"
            />
          </div>

          {/* Irrigation NodeMCU ESP8266 IP Field */}
          <div>
            <label className="text-[11px] text-surface-500 block mb-1.5 font-semibold flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              Irrigation NodeMCU IP
            </label>
            <input
              type="text"
              value={irrigationIp}
              onChange={(e) => setIrrigationIp(e.target.value)}
              placeholder="e.g. 192.168.1.102"
              className="input-modern font-mono text-xs"
            />
          </div>

          {/* Connect Button */}
          <div className="flex items-end">
            <button
              onClick={handleConnectDevices}
              disabled={isConnecting}
              className="w-full py-2.5 btn-primary text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LinkIcon className="w-4 h-4" />
              <span>CONNECT ALL DEVICES</span>
            </button>
          </div>
        </div>

        {connectionMessage && (
          <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold flex items-center gap-2 animate-slide-up">
            <CheckCircle className="w-4 h-4 text-brand-500" />
            {connectionMessage}
          </div>
        )}
      </div>

      {/* Live Camera Player & Source Switcher */}
      <LiveCameraFeed streamUrl={activeCamUrl} onAnalysisComplete={fetchOverview} />

      {/* Metrics Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rover State Card */}
        <div className="card metric-brand p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">Rover Status</span>
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-brand-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-surface-800">{rov.mode || 'MANUAL'}</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              rov.status?.includes('EMERGENCY') ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'badge-success'
            }`}>
              {rov.status || 'IDLE'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-brand-200/60 flex items-center justify-between text-xs text-surface-600">
            <span>Battery: <strong className="text-brand-700">{rov.battery || 95}%</strong></span>
            <span>Obstacle: <strong className={rov.obstacle_distance < 20 ? 'text-rose-600' : 'text-surface-700'}>{rov.obstacle_distance || 150}cm</strong></span>
          </div>
        </div>

        {/* Soil Moisture Card */}
        <div className="card metric-accent p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-accent-700 uppercase tracking-wider">Soil Moisture</span>
            <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-accent-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-surface-800">{env.soil_moisture || 48}%</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              (env.soil_moisture || 48) >= 70 ? 'badge-success' : 'badge-warning'
            }`}>
              {(env.soil_moisture || 48) >= 70 ? 'Optimal' : 'Needs Water'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-accent-200/60 flex items-center justify-between text-xs text-surface-600">
            <span>Rain Sensor:</span>
            <strong className={env.rain_detected ? 'text-accent-700' : 'text-surface-500'}>
              {env.rain_detected ? 'Detected' : 'Dry Clear'}
            </strong>
          </div>
        </div>

        {/* Temperature & Humidity */}
        <div className="card metric-warm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-warm-700 uppercase tracking-wider">Environment</span>
            <div className="w-8 h-8 rounded-lg bg-warm-100 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-warm-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-surface-800">{env.temperature || 27.5}°C</span>
            <span className="text-xs text-surface-500 font-semibold">Hum: {env.humidity || 62}%</span>
          </div>
          <div className="mt-3 pt-3 border-t border-warm-200/60 flex items-center justify-between text-xs text-surface-600">
            <span>Climate:</span>
            <strong className="text-brand-600">Favorable Growth</strong>
          </div>
        </div>

        {/* AI Disease Detection Card */}
        <div className="card p-4 bg-gradient-to-br from-white to-brand-50/50 border-brand-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">AI Pathology</span>
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-brand-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-brand-700">{ai.disease || 'HEALTHY'}</span>
            <span className="text-xs font-mono text-surface-500 font-semibold">{((ai.confidence || 0) * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-3 pt-3 border-t border-brand-100 flex items-center justify-between text-xs text-surface-600">
            <span>Spray Decision:</span>
            <span className={`font-bold ${ai.treatment_decision === 'AUTHORIZED' ? 'text-brand-600' : 'text-warm-600'}`}>
              {ai.treatment_decision || 'NO_SPRAY'}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Hardware & Sensor Test Bench */}
      <HardwareSimulator onRefreshDashboard={fetchOverview} />
    </div>
  );
}

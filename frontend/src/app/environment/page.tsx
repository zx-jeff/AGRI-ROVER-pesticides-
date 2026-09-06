'use client';

import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Thermometer,
  Droplets,
  CloudRain,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function EnvironmentPage() {
  const [data, setData] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);

  const fetchSensorData = async () => {
    try {
      const [resHist, resLatest] = await Promise.all([
        fetch('http://localhost:8000/api/environment/history?hours=24'),
        fetch('http://localhost:8000/api/environment/telemetry'),
      ]);
      if (resHist.ok) {
        const histData = await resHist.json();
        const formatted = histData.map((d: any) => ({
          time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: d.temperature,
          humidity: d.humidity,
          soil_moisture: d.soil_moisture,
        }));
        setData(formatted);
      }
      if (resLatest.ok) setLatest(await resLatest.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-800 tracking-tight">Environmental Analytics</h1>
          <p className="text-sm text-surface-500 mt-0.5">Real-time & 24-hour sensor trends for farm microclimate</p>
        </div>
        <button
          onClick={fetchSensorData}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-surface-50 text-surface-600 text-xs font-bold rounded-xl border border-surface-200 transition-all duration-200 shadow-card hover:shadow-card-hover"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card metric-warm p-4">
          <span className="text-xs font-bold text-warm-700 uppercase tracking-wider block mb-2">Temperature</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-surface-800">{latest?.temperature || 27.5}°C</span>
            <div className="w-8 h-8 rounded-lg bg-warm-100 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-warm-600" />
            </div>
          </div>
        </div>

        <div className="card metric-brand p-4">
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider block mb-2">Humidity</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-surface-800">{latest?.humidity || 62}%</span>
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <CloudSun className="w-4 h-4 text-brand-600" />
            </div>
          </div>
        </div>

        <div className="card metric-accent p-4">
          <span className="text-xs font-bold text-accent-700 uppercase tracking-wider block mb-2">Soil Moisture</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-surface-800">{latest?.soil_moisture || 48}%</span>
            <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-accent-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-white to-accent-50/50 border-accent-100">
          <span className="text-xs font-bold text-accent-700 uppercase tracking-wider block mb-2">Rain Sensor</span>
          <div className="flex items-baseline justify-between">
            <span className={`text-sm font-extrabold ${latest?.rain_detected ? 'text-accent-600' : 'text-surface-500'}`}>
              {latest?.rain_detected ? '🌧️ Rain Active' : '☀️ Dry Clear'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
              <CloudRain className="w-4 h-4 text-accent-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-surface-100 border border-surface-200 flex items-center justify-center">
            <CloudSun className="w-3.5 h-3.5 text-surface-600" />
          </div>
          24-Hour Sensor Trends
        </h2>

        <div className="w-full h-80 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#10b981" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="soil_moisture" name="Soil Moisture (%)" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

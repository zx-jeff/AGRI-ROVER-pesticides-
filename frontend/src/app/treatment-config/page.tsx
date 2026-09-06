'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Layers
} from 'lucide-react';

export default function TreatmentConfigPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [diseaseName, setDiseaseName] = useState<string>('DISEASE_1');
  const [tankId, setTankId] = useState<string>('Tank 1');
  const [pumpId, setPumpId] = useState<string>('Pump 1');
  const [durationSec, setDurationSec] = useState<number>(3.0);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/treatment/config');
      if (res.ok) setConfigs(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSaveConfig = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/treatment/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disease_name: diseaseName,
          tank_id: tankId,
          pump_id: pumpId,
          duration_sec: durationSec,
          enabled: enabled,
        }),
      });
      if (res.ok) {
        setSaveStatus('Treatment configuration saved successfully!');
        fetchConfigs();
        setTimeout(() => setSaveStatus(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-800 tracking-tight">Treatment Configuration</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Disease-to-tank/pump mappings and spray durations
          </p>
        </div>
        <button
          onClick={fetchConfigs}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-surface-50 text-surface-600 text-xs font-bold rounded-xl border border-surface-200 transition-all duration-200 shadow-card hover:shadow-card-hover"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {saveStatus && (
        <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold flex items-center gap-2 animate-slide-up">
          <CheckCircle className="w-4 h-4 text-brand-500" />
          {saveStatus}
        </div>
      )}

      {/* Form & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Form */}
        <div className="card p-6 space-y-4 lg:col-span-1">
          <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-brand-600" />
            </div>
            Edit Spray Rule
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-surface-500 block mb-1.5 font-semibold">Disease Target:</label>
              <select
                value={diseaseName}
                onChange={(e) => setDiseaseName(e.target.value)}
                className="select-modern font-mono"
              >
                <option value="DISEASE_1">DISEASE_1 (Leaf Spot / Blight)</option>
                <option value="DISEASE_2">DISEASE_2 (Rust / Mildew)</option>
              </select>
            </div>

            <div>
              <label className="text-surface-500 block mb-1.5 font-semibold">Assigned Tank:</label>
              <input
                type="text"
                value={tankId}
                onChange={(e) => setTankId(e.target.value)}
                className="input-modern"
              />
            </div>

            <div>
              <label className="text-surface-500 block mb-1.5 font-semibold">Assigned Pump:</label>
              <input
                type="text"
                value={pumpId}
                onChange={(e) => setPumpId(e.target.value)}
                className="input-modern"
              />
            </div>

            <div>
              <label className="text-surface-500 block mb-1.5 font-semibold">Pulse Duration (sec):</label>
              <input
                type="number"
                step="0.5"
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="input-modern font-mono"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded accent-brand-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="enabled" className="text-surface-600 cursor-pointer font-medium">
                Rule Active & Enabled
              </label>
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            className="w-full py-3 btn-primary text-xs flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            SAVE RULE MAPPING
          </button>
        </div>

        {/* Existing Config Table */}
        <div className="card p-6 lg:col-span-2 space-y-4">
          <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-surface-100 border border-surface-200 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-surface-600" />
            </div>
            Active Treatment Mappings
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th>Disease</th>
                  <th>Tank</th>
                  <th>Pump</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-mono font-bold text-brand-700">{c.disease_name}</td>
                    <td className="text-surface-700">{c.tank_id}</td>
                    <td className="text-surface-700">{c.pump_id}</td>
                    <td className="font-mono text-brand-600 font-bold">{c.duration_sec}s</td>
                    <td>
                      <span className={c.enabled ? 'badge-success' : 'badge-warning'}>
                        {c.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

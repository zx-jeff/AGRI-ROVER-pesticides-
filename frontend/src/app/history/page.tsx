'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'inspections' | 'treatments' | 'irrigation' | 'logs'>('inspections');
  const [inspections, setInspections] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [irrigationEvents, setIrrigationEvents] = useState<any[]>([]);
  const [commandLogs, setCommandLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchAllHistory = async () => {
    try {
      const [resInsp, resTreat, resIrrig, resLogs] = await Promise.all([
        fetch('http://localhost:8000/api/ai/history'),
        fetch('http://localhost:8000/api/treatment/history'),
        fetch('http://localhost:8000/api/irrigation/events'),
        fetch('http://localhost:8000/api/alerts/logs'),
      ]);
      if (resInsp.ok) setInspections(await resInsp.json());
      if (resTreat.ok) setTreatments(await resTreat.json());
      if (resIrrig.ok) setIrrigationEvents(await resIrrig.json());
      if (resLogs.ok) setCommandLogs(await resLogs.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAllHistory();
  }, []);

  const tabLabels = {
    inspections: '🔬 Inspections',
    treatments: '💊 Treatments',
    irrigation: '💧 Irrigation',
    logs: '📋 Logs',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-800 tracking-tight">Audit & Event Logs</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Historical trail for inspections, treatments, irrigation & commands
          </p>
        </div>
        <button
          onClick={fetchAllHistory}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-surface-50 text-surface-600 text-xs font-bold rounded-xl border border-surface-200 transition-all duration-200 shadow-card hover:shadow-card-hover"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Logs
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {(['inspections', 'treatments', 'irrigation', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm'
                  : 'bg-surface-50 border-surface-200 text-surface-500 hover:text-surface-700 hover:border-surface-300'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-modern pl-9 text-xs"
          />
        </div>
      </div>

      {/* Tables */}
      <div className="card p-6">
        <div className="overflow-x-auto">
          {activeTab === 'inspections' && (
            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Timestamp</th>
                  <th>Disease</th>
                  <th>Confidence</th>
                  <th>Decision</th>
                  <th>Tank</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((i: any) => (
                  <tr key={i.id}>
                    <td className="font-mono font-bold text-surface-700">{i.inspection_code}</td>
                    <td className="font-mono text-surface-500 text-xs">{new Date(i.timestamp).toLocaleString()}</td>
                    <td className="font-semibold text-brand-700">{i.disease}</td>
                    <td className="font-mono text-sm">{(i.confidence * 100).toFixed(0)}%</td>
                    <td>
                      <span className={i.treatment_decision === 'AUTHORIZED' ? 'badge-success' : 'badge-warning'}>
                        {i.treatment_decision}
                      </span>
                    </td>
                    <td className="text-surface-500">{i.tank_used || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'treatments' && (
            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Disease</th>
                  <th>Tank</th>
                  <th>Pump</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map((t: any) => (
                  <tr key={t.id}>
                    <td className="font-mono text-surface-500">#{t.id}</td>
                    <td className="font-mono text-surface-500 text-xs">{new Date(t.executed_at).toLocaleString()}</td>
                    <td className="font-bold text-brand-700">{t.disease_name}</td>
                    <td className="text-surface-700">{t.tank_id}</td>
                    <td className="text-surface-700">{t.pump_id}</td>
                    <td className="font-mono text-brand-600 font-bold">{t.duration_sec}s</td>
                    <td><span className="badge-success">{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'irrigation' && (
            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Zone</th>
                  <th>Trigger</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {irrigationEvents.map((e: any) => (
                  <tr key={e.id}>
                    <td className="font-mono text-surface-500">#{e.id}</td>
                    <td className="font-mono text-surface-500 text-xs">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="font-semibold text-surface-700">{e.zone_name}</td>
                    <td className="text-surface-500">{e.trigger_type}</td>
                    <td className="font-mono text-accent-600 font-bold">{e.duration_sec}s</td>
                    <td><span className="badge-success">{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'logs' && (
            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Timestamp</th>
                  <th>Device</th>
                  <th>Command</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {commandLogs.map((l: any) => (
                  <tr key={l.id}>
                    <td className="font-mono text-surface-500 text-xs">{l.request_id}</td>
                    <td className="font-mono text-surface-500 text-xs">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="text-surface-700">{l.device_id}</td>
                    <td className="font-mono text-brand-700 font-bold">{l.command}</td>
                    <td><span className="badge-success">{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

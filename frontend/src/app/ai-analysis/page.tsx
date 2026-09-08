'use client';

import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Camera,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  RefreshCw,
  Zap,
  Sparkles,
  Key,
  Leaf
} from 'lucide-react';

export default function AiAnalysisPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [latestResult, setLatestResult] = useState<any>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/ai/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile && !imagePreview) {
      alert("Please select or upload a real plant leaf photo first.");
      return;
    }

    setIsAnalyzing(true);
    setLatestResult(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    } else if (imagePreview) {
      formData.append('image_base64', imagePreview);
    }

    if (geminiKey.trim()) {
      formData.append('gemini_api_key', geminiKey.trim());
    }

    try {
      const res = await fetch('http://localhost:8000/api/ai/upload-and-analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setLatestResult(data);
      fetchHistory();
    } catch (e) {
      console.error('Real AI Analysis failed', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-800 tracking-tight">AI Crop Pathology Analyzer</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Gemini Vision AI — Real plant disease detection & safety engine
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-surface-50 text-surface-600 text-xs font-bold rounded-xl border border-surface-200 transition-all duration-200 shadow-card hover:shadow-card-hover"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh History
        </button>
      </div>

      {/* API Key Config */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-warm-50 border border-warm-200 flex items-center justify-center flex-shrink-0">
            <Key className="w-4 h-4 text-warm-600" />
          </div>
          <div>
            <span className="font-bold text-surface-700 block">Gemini API Key</span>
            <span className="text-surface-400 text-[11px]">
              Configure in <code className="bg-surface-100 px-1.5 py-0.5 rounded border border-surface-200 text-brand-600 font-mono text-[10px]">backend/.env</code> or paste below
            </span>
          </div>
        </div>
        <input
          type="password"
          placeholder="Paste GEMINI_API_KEY (AIzaSy...)"
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
          className="input-modern md:w-72 font-mono text-xs"
        />
      </div>

      {/* Grid: Upload & AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Image Upload */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-accent-50 border border-accent-200 flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-accent-600" />
            </div>
            Upload Leaf Specimen
          </h2>

          <div className="relative border-2 border-dashed border-surface-200 hover:border-brand-400 rounded-xl p-6 flex flex-col items-center justify-center bg-surface-50/50 transition-all duration-200 min-h-[280px]">
            {imagePreview ? (
              <div className="relative w-full h-64 rounded-lg overflow-hidden border border-surface-200 shadow-sm">
                <img src={imagePreview} alt="Real Leaf Specimen" className="w-full h-full object-contain bg-white" />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 px-2.5 py-1 bg-white/90 backdrop-blur hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-surface-200 transition-all duration-200"
                >
                  Clear
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-500">
                  <Leaf className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-sm font-bold text-surface-700">Select or Drag Leaf Image</span>
                  <p className="text-xs text-surface-400 mt-1">Upload actual leaf photos with lesions, rust, blight or healthy foliage</p>
                </div>
                <span className="px-4 py-2 bg-white hover:bg-surface-50 text-brand-600 text-xs font-bold rounded-xl border border-surface-200 transition-all duration-200 shadow-sm">
                  Browse Device Photos
                </span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>

          <button
            onClick={handleUploadAndAnalyze}
            disabled={isAnalyzing}
            className="w-full py-3.5 btn-primary text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-brand-200" />
                <span>Gemini AI Inspecting Leaf...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                <span>ANALYZE WITH GEMINI VISION</span>
              </>
            )}
          </button>
        </div>

        {/* Right: AI Analysis Result */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              </div>
              Pathology Analysis & Authorization
            </h2>

            {latestResult ? (
              <div className="space-y-5 animate-slide-up">
                {/* AI Engine Badge */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-surface-500 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    AI Engine:
                  </span>
                  <span className="font-mono text-brand-700 font-bold bg-brand-50 px-3 py-1 rounded-lg border border-brand-200 text-xs">
                    {latestResult.ai_source || 'Google Gemini Vision AI'}
                  </span>
                </div>

                {/* PROMINENT BIG DISEASE NAME & TYPE BANNER */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-surface-50 via-white to-surface-100 border-2 border-surface-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-full border shadow-sm ${
                      latestResult.disease === 'HEALTHY'
                        ? 'bg-brand-100 text-brand-800 border-brand-300'
                        : latestResult.disease === 'UNKNOWN'
                        ? 'bg-warm-100 text-warm-800 border-warm-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {latestResult.disease_type || 'Fungal Pathology'}
                    </span>

                    <span className="font-mono font-extrabold text-sm text-brand-600 bg-white px-2.5 py-1 rounded-lg border border-surface-200">
                      Confidence: {(latestResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* BIG DISEASE NAME */}
                  <h3 className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight mt-1 ${
                    latestResult.disease === 'HEALTHY'
                      ? 'text-brand-700'
                      : latestResult.disease === 'UNKNOWN'
                      ? 'text-warm-700'
                      : 'text-rose-600'
                  }`}>
                    {latestResult.disease_name || latestResult.disease}
                  </h3>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-surface-400 font-mono">
                      System Class Code: <strong className="text-surface-700">{latestResult.disease}</strong>
                    </span>
                  </div>
                </div>

                {/* GEMINI PATHOLOGY INFORMATION & CAUSE */}
                {latestResult.disease_info && (
                  <div className="p-4 rounded-xl bg-brand-50/70 border border-brand-200 space-y-1.5 text-xs">
                    <span className="font-bold text-brand-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-brand-600" />
                      Gemini Pathology Information & Pathogen Cause
                    </span>
                    <p className="text-surface-700 leading-relaxed font-medium">
                      {latestResult.disease_info}
                    </p>
                  </div>
                )}

                {/* GEMINI TREATMENT & PREVENTION GUIDE */}
                {latestResult.prevention_treatment && (
                  <div className="p-4 rounded-xl bg-accent-50/70 border border-accent-200 space-y-1.5 text-xs">
                    <span className="font-bold text-accent-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-accent-600" />
                      Gemini Prevention & Agricultural Treatment Plan
                    </span>
                    <p className="text-surface-700 leading-relaxed font-medium">
                      {latestResult.prevention_treatment}
                    </p>
                  </div>
                )}

                {/* OBSERVED CLINICAL SYMPTOMS */}
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 text-xs space-y-1">
                  <span className="text-surface-500 block font-bold uppercase tracking-wider text-[11px]">Visible Symptoms & Lesions:</span>
                  <p className="text-surface-700 leading-relaxed">{latestResult.description}</p>
                </div>

                {/* ROVER ACTION DIRECTIVE */}
                <div className="p-3 rounded-xl bg-surface-50 border border-surface-200 text-xs flex justify-between items-center">
                  <span className="text-surface-500 font-medium">Rover Spray Directive:</span>
                  <span className="font-mono font-bold text-surface-800 bg-white px-2.5 py-1 rounded-lg border border-surface-200">
                    {latestResult.recommended_action}
                  </span>
                </div>

                {/* SAFETY & PUMP AUTHORIZATION STATUS */}
                <div className={`p-4 rounded-xl border ${
                  latestResult.treatment_authorized
                    ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  <div className="flex items-center gap-2 font-extrabold text-sm mb-1">
                    {latestResult.treatment_authorized ? (
                      <CheckCircle className="w-5 h-5 text-brand-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                    {latestResult.treatment_authorized ? 'TREATMENT PUMP AUTHORIZED' : 'TREATMENT BLOCKED BY SAFETY'}
                  </div>
                  <p className="text-xs opacity-90">{latestResult.safety_message}</p>

                  {latestResult.treatment_authorized && (
                    <div className="mt-3 pt-3 border-t border-brand-200/60 text-xs flex justify-between font-mono font-bold text-brand-800">
                      <span>Assigned Tank: {latestResult.tank_used} ({latestResult.pump_used})</span>
                      <span>Spray Duration: {latestResult.spray_duration}s</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-surface-400 text-center p-6 border-2 border-dashed border-surface-200 rounded-xl">
                <div className="w-16 h-16 rounded-2xl bg-surface-50 border border-surface-200 flex items-center justify-center mb-3">
                  <BrainCircuit className="w-8 h-8 text-surface-300" />
                </div>
                <p className="text-xs max-w-xs text-surface-500">Upload a real plant leaf photo to run Gemini AI pathology analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspection History Table */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-surface-800 text-sm flex items-center gap-2 border-b border-surface-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-surface-100 border border-surface-200 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-surface-600" />
          </div>
          Inspection History
        </h2>

        <div className="overflow-x-auto">
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
              {history.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-mono font-bold text-surface-700">{item.inspection_code}</td>
                  <td className="font-mono text-surface-500 text-xs">{new Date(item.timestamp).toLocaleString()}</td>
                  <td className="font-semibold text-brand-700">{item.disease}</td>
                  <td className="font-mono text-sm">{(item.confidence * 100).toFixed(0)}%</td>
                  <td>
                    <span className={item.treatment_decision === 'AUTHORIZED' ? 'badge-success' : 'badge-warning'}>
                      {item.treatment_decision}
                    </span>
                  </td>
                  <td className="text-surface-500">{item.tank_used || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Signal, Eye, Scan, RefreshCw, Video, Settings2, Play, CheckCircle, XCircle, AlertTriangle, Crop, RotateCcw } from 'lucide-react';

interface LiveCameraFeedProps {
  streamUrl?: string;
  onAnalysisComplete?: (result: any) => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function LiveCameraFeed({ streamUrl, onAnalysisComplete }: LiveCameraFeedProps) {
  const [cameraSource, setCameraSource] = useState<'laptop' | 'esp32'>('laptop');
  const [esp32Ip, setEsp32Ip] = useState<string>(streamUrl || 'http://192.168.1.100:81/stream');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // ROI Selection State
  const [isRoiEnabled, setIsRoiEnabled] = useState<boolean>(false);
  const [roiRect, setRoiRect] = useState<Rect | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (streamUrl) {
      setEsp32Ip(streamUrl);
      setCameraSource('esp32');
    }
  }, [streamUrl]);

  // Initialize Laptop/PC Webcam stream when source is 'laptop'
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (cameraSource === 'laptop') {
      setWebcamError(null);
      navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
        .then((mediaStream) => {
          stream = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setIsWebcamActive(true);
        })
        .catch((err) => {
          console.error("Laptop Webcam Access Error:", err);
          setWebcamError("Could not access Laptop Camera. Please check camera permissions.");
          setIsWebcamActive(false);
        });
    } else {
      setIsWebcamActive(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraSource]);

  // Mouse & Touch ROI Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRoiEnabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setRoiRect({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const w = Math.abs(currentX - startPoint.x);
    const h = Math.abs(currentY - startPoint.y);

    setRoiRect({ x, y, w, h });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isRoiEnabled || !containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    setStartPoint({ x, y });
    setRoiRect({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.touches[0].clientX - rect.left;
    const currentY = e.touches[0].clientY - rect.top;

    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const w = Math.abs(currentX - startPoint.x);
    const h = Math.abs(currentY - startPoint.y);

    setRoiRect({ x, y, w, h });
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const resetRoi = () => {
    setRoiRect(null);
    setCroppedPreview(null);
  };

  // Capture frame from active camera stream (Full or ROI cropped) and send to Gemini AI
  const handleCaptureAndAnalyze = async () => {
    let fullCanvas = canvasRef.current || document.createElement('canvas');
    let sourceWidth = 640;
    let sourceHeight = 480;

    if (cameraSource === 'laptop') {
      if (!videoRef.current) return;
      const video = videoRef.current;
      sourceWidth = video.videoWidth || 640;
      sourceHeight = video.videoHeight || 480;
      fullCanvas.width = sourceWidth;
      fullCanvas.height = sourceHeight;
      const ctx = fullCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, sourceWidth, sourceHeight);
    } else {
      const streamImg = document.getElementById('esp32-stream-img') as HTMLImageElement;
      if (streamImg) {
        sourceWidth = streamImg.naturalWidth || 800;
        sourceHeight = streamImg.naturalHeight || 600;
        fullCanvas.width = sourceWidth;
        fullCanvas.height = sourceHeight;
        const ctx = fullCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(streamImg, 0, 0, sourceWidth, sourceHeight);
        }
      }
    }

    let finalCanvas = fullCanvas;

    // Apply ROI cropping if ROI is enabled and a rectangle was selected
    if (isRoiEnabled && roiRect && roiRect.w > 10 && roiRect.h > 10 && containerRef.current) {
      const containerBounds = containerRef.current.getBoundingClientRect();
      const scaleX = sourceWidth / containerBounds.width;
      const scaleY = sourceHeight / containerBounds.height;

      const cropX = roiRect.x * scaleX;
      const cropY = roiRect.y * scaleY;
      const cropW = roiRect.w * scaleX;
      const cropH = roiRect.h * scaleY;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d');

      if (cropCtx) {
        cropCtx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        finalCanvas = cropCanvas;
      }
    }

    const imageBase64 = finalCanvas.toDataURL('image/jpeg');
    setCroppedPreview(imageBase64);

    if (!imageBase64) {
      alert("No active camera stream available to capture frame.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('image_base64', imageBase64);

    try {
      const res = await fetch('http://localhost:8000/api/ai/upload-and-analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setAnalysisResult(data);
      if (onAnalysisComplete) onAnalysisComplete(data);
    } catch (e) {
      console.error("Camera frame analysis failed:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 relative overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header & Source Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-50 border border-accent-200 flex items-center justify-center">
            <Camera className="w-4 h-4 text-accent-600" />
          </div>
          <div>
            <h2 className="font-bold text-surface-800 text-sm tracking-tight">Live Camera Feed</h2>
            <p className="text-[11px] text-surface-400 font-medium">Stream and analyze leaves in real-time</p>
          </div>
        </div>

        {/* Source Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-surface-50 p-1 rounded-xl border border-surface-200 text-xs">
          <button
            onClick={() => setCameraSource('laptop')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-200 flex items-center gap-1.5 ${
              cameraSource === 'laptop'
                ? 'bg-white text-brand-700 shadow-card border border-brand-200'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Laptop Camera
          </button>
          <button
            onClick={() => setCameraSource('esp32')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all duration-200 flex items-center gap-1.5 ${
              cameraSource === 'esp32'
                ? 'bg-white text-accent-700 shadow-card border border-accent-200'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            ESP32-CAM
          </button>
        </div>
      </div>

      {/* ROI Toggle Bar */}
      <div className="flex items-center justify-between bg-surface-50 px-3 py-2 rounded-xl border border-surface-200 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsRoiEnabled(!isRoiEnabled);
              if (isRoiEnabled) resetRoi();
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              isRoiEnabled
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-surface-600 border border-surface-300 hover:bg-surface-100'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            {isRoiEnabled ? 'ROI Mode Active' : 'Enable Leaf ROI Crop'}
          </button>
          {isRoiEnabled && (
            <span className="text-[11px] text-brand-700 font-semibold hidden sm:inline">
              Click & drag on live stream to select a leaf region
            </span>
          )}
        </div>

        {roiRect && roiRect.w > 0 && (
          <button
            onClick={resetRoi}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
          >
            <RotateCcw className="w-3 h-3" /> Reset ROI Box
          </button>
        )}
      </div>

      {/* Main Video Stream Container with ROI Canvas Overlay */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full h-72 bg-surface-900 rounded-xl overflow-hidden border border-surface-200 flex items-center justify-center ${
          isRoiEnabled ? 'cursor-crosshair' : ''
        }`}
      >
        {cameraSource === 'laptop' ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover pointer-events-none"
            />
            {webcamError && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-rose-600 text-xs p-4 text-center">
                <AlertTriangle className="w-8 h-8 mb-2 text-rose-500" />
                <p className="font-bold">{webcamError}</p>
                <p className="text-surface-500 text-[11px] mt-1">Please allow camera permissions in browser settings.</p>
              </div>
            )}
          </>
        ) : (
          <img
            id="esp32-stream-img"
            src={esp32Ip}
            alt="ESP32-CAM Stream"
            className="w-full h-full object-cover pointer-events-none"
            onError={() => {
              const img = document.getElementById('esp32-stream-img') as HTMLImageElement;
              if (img && !img.src.includes('/api/camera/stream')) {
                img.src = "http://localhost:8000/api/camera/stream";
              }
            }}
          />
        )}

        {/* Bounding Box Render */}
        {isRoiEnabled && roiRect && roiRect.w > 0 && roiRect.h > 0 && (
          <div
            style={{
              left: `${roiRect.x}px`,
              top: `${roiRect.y}px`,
              width: `${roiRect.w}px`,
              height: `${roiRect.h}px`,
            }}
            className="absolute border-2 border-amber-400 bg-amber-400/20 rounded pointer-events-none shadow-elevated"
          >
            <div className="absolute -top-5 left-0 bg-amber-500 text-surface-900 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase shadow-sm">
              ROI: {Math.round(roiRect.w)}×{Math.round(roiRect.h)}
            </div>
          </div>
        )}

        {/* Live Status Indicator */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[11px] font-semibold text-surface-700 border border-surface-200 flex items-center gap-1.5 shadow-sm pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          {cameraSource === 'laptop' ? 'LAPTOP WEBCAM' : `ESP32: ${esp32Ip}`}
        </div>

        {/* AI Scanning Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-brand-900/40 border-2 border-brand-400 animate-pulse pointer-events-none flex flex-col items-center justify-center z-10">
            <div className="p-5 bg-white/95 backdrop-blur-sm border border-brand-200 rounded-2xl text-center space-y-2 shadow-elevated">
              <Scan className="w-8 h-8 text-brand-500 mx-auto animate-spin" />
              <span className="text-xs font-bold text-brand-700 tracking-wider block uppercase">
                {isRoiEnabled && roiRect ? 'Analyzing Cropped ROI' : 'AI Scanning Frame'}
              </span>
              <span className="text-[10px] text-surface-500 font-medium">Sending to Gemini Vision API...</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar & Preview */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleCaptureAndAnalyze}
            disabled={isAnalyzing}
            className="w-full sm:w-auto px-6 py-3 btn-primary text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <span>Analyzing Frame...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{isRoiEnabled && roiRect ? 'ANALYZE CROPPED ROI' : 'CAPTURE & ANALYZE FULL FRAME'}</span>
              </>
            )}
          </button>
        </div>

        {croppedPreview && (
          <div className="flex items-center gap-2 border border-surface-200 bg-surface-50 p-1.5 rounded-xl">
            <img src={croppedPreview} alt="Captured Crop" className="w-10 h-10 object-cover rounded-lg border border-surface-300" />
            <span className="text-[10px] font-bold text-surface-600">Captured Leaf ROI</span>
          </div>
        )}
      </div>

      {/* Realtime Analysis Output */}
      {analysisResult && (
        <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-2 text-xs animate-slide-up">
          <div className="flex items-center justify-between border-b border-surface-200 pb-2">
            <span className="text-surface-500 font-semibold">Pathology Diagnosis:</span>
            <span className="font-extrabold text-brand-700">{analysisResult.disease}</span>
          </div>

          <div className="text-surface-600 leading-relaxed pt-1">
            <strong className="text-surface-700">Clinical Findings:</strong> {analysisResult.description}
          </div>

          <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${
            analysisResult.treatment_authorized
              ? 'bg-brand-50 border-brand-200 text-brand-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {analysisResult.treatment_authorized ? <CheckCircle className="w-4 h-4 text-brand-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
            <span>{analysisResult.safety_message}</span>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import {
  LayoutDashboard,
  Bot,
  BrainCircuit,
  Droplets,
  CloudSun,
  History,
  Settings,
  ShieldAlert,
  Wifi,
  Power,
  Activity,
  AlertTriangle,
  Leaf,
  ChevronRight
} from 'lucide-react';

function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [roverMode, setRoverMode] = useState<string>('MANUAL');
  const [emergencyActive, setEmergencyActive] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectWs = () => {
      if (!isMounted) return;
      try {
        ws = new WebSocket('ws://localhost:8000/ws');

        ws.onopen = () => {
          if (isMounted) setIsWsConnected(true);
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsWsConnected(false);
            reconnectTimer = setTimeout(connectWs, 2000);
          }
        };

        ws.onerror = () => {
          if (isMounted) {
            setIsWsConnected(false);
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'ROVER_UPDATE') {
              if (msg.data.mode) setRoverMode(msg.data.mode);
              if (msg.data.mode === 'EMERGENCY_STOP') setEmergencyActive(true);
              else setEmergencyActive(false);
            }
          } catch (e) {
            console.error('WS parse error', e);
          }
        };
      } catch (e) {
        if (isMounted) {
          setIsWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 2000);
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const handleGlobalEmergencyStop = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/rover/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'EMERGENCY_STOP' }),
      });
      if (res.ok) {
        setEmergencyActive(true);
        setRoverMode('EMERGENCY_STOP');
      }
    } catch (e) {
      console.error('Failed to trigger emergency stop', e);
    }
  };

  const handleResetEmergency = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/rover/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'RESET' }),
      });
      if (res.ok) {
        setEmergencyActive(false);
        setRoverMode('MANUAL');
      }
    } catch (e) {
      console.error('Failed to reset emergency stop', e);
    }
  };

  const navItems = [
    { name: t('navDashboard'), href: '/', icon: LayoutDashboard },
    { name: t('navRoverControl'), href: '/rover', icon: Bot },
    { name: t('navAiCropAnalysis'), href: '/ai-analysis', icon: BrainCircuit },
    { name: t('navSmartIrrigation'), href: '/irrigation', icon: Droplets },
    { name: t('navEnvironment'), href: '/environment', icon: CloudSun },
    { name: t('navAuditHistory'), href: '/history', icon: History },
    { name: t('navTreatmentConfig'), href: '/treatment-config', icon: Settings },
  ];

  return (
    <body className="bg-surface-50 text-surface-800 flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-[260px] bg-white border-r border-surface-200 flex flex-col flex-shrink-0 shadow-sm">
        {/* Brand Header */}
        <div className="p-5 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-surface-800 text-[15px] tracking-tight leading-none">{t('appName')}</h1>
              <p className="text-[11px] text-brand-600 font-semibold mt-0.5">{t('appSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold shadow-sm border border-brand-100'
                    : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-brand-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-400" />}
              </Link>
            );
          })}
        </nav>

        {/* System Status Footprint */}
        <div className="p-4 border-t border-surface-200 bg-surface-50/50 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-500 flex items-center gap-1.5 font-medium">
              <Wifi className={`w-3.5 h-3.5 ${isWsConnected ? 'text-brand-500' : 'text-rose-500'}`} />
              {t('wsBridge')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isWsConnected ? 'bg-brand-50 text-brand-600 border border-brand-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
              {isWsConnected ? t('online') : t('offline')}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-500 flex items-center gap-1.5 font-medium">
              <Activity className={`w-3.5 h-3.5 ${emergencyActive ? 'text-rose-500' : 'text-brand-500'}`} />
              {t('roverMode')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              emergencyActive ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' : 'bg-brand-50 text-brand-600 border border-brand-200'
            }`}>
              {roverMode === 'MANUAL' ? t('modeManual') : roverMode}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-surface-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">{t('systemStatus')}</span>
            {emergencyActive ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t('emergencyStop')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-600 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                {t('allSystemsNominal')}
              </span>
            )}
          </div>

          {/* Language Selector & Global Emergency Actions */}
          <div className="flex items-center gap-3">
            <LanguageSelector />

            {emergencyActive ? (
              <button
                onClick={handleResetEmergency}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-lg shadow-brand-500/25"
              >
                <Power className="w-4 h-4" />
                {t('resetEmergency')}
              </button>
            ) : (
              <button
                onClick={handleGlobalEmergencyStop}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-lg shadow-rose-500/25"
              >
                <ShieldAlert className="w-4 h-4" />
                {t('emergencyStop')}
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </body>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>AgriRover AI - Smart Farming Assistant</title>
        <meta name="description" content="Autonomous Crop Monitoring Rover & Smart Farming AI Assistant" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <LanguageProvider>
        <AppShell>{children}</AppShell>
      </LanguageProvider>
    </html>
  );
}


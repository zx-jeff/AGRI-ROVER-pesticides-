'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { code: 'ml', label: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-50 border border-surface-200 hover:bg-surface-100 text-surface-700 text-xs font-bold transition-all duration-200 shadow-sm"
        title="Select Language / भाषा चुनें / భాష ఎంచుకోండి / மொழிជ្រើសរើស"
      >
        <Globe className="w-3.5 h-3.5 text-brand-600" />
        <span className="text-sm">{currentLang.flag}</span>
        <span className="hidden sm:inline text-[12px] font-semibold">{currentLang.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-elevated border border-surface-200 py-1.5 z-50 animate-slide-up max-h-80 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-surface-400 border-b border-surface-100 mb-1">
            Indian Languages & English
          </div>

          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
                language === lang.code
                  ? 'bg-brand-50 text-brand-700 font-bold'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
              </span>
              {language === lang.code && <Check className="w-3.5 h-3.5 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

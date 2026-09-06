'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'te' | 'ta' | 'mr' | 'kn' | 'bn' | 'gu' | 'ml';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Brand & App
    appName: "AgriRover AI",
    appSubtitle: "Smart Farming Assistant",
    systemStatus: "System:",
    allSystemsNominal: "ALL SYSTEMS NOMINAL",
    emergencyStop: "EMERGENCY STOP",
    resetEmergency: "RESET EMERGENCY",
    wsBridge: "WS Bridge",
    roverMode: "Rover",
    online: "ONLINE",
    offline: "OFFLINE",

    // Navigation
    navDashboard: "Dashboard",
    navRoverControl: "Rover Control",
    navAiCropAnalysis: "AI Crop Analysis",
    navSmartIrrigation: "Smart Irrigation",
    navEnvironment: "Environment",
    navAuditHistory: "Audit & History",
    navTreatmentConfig: "Treatment Config",

    // Dashboard Overview
    dashboardTitle: "Smart Farming Dashboard",
    dashboardSubtitle: "Real-time crop health monitoring & rover telemetry",
    loadingDashboard: "Loading AgriRover Dashboard...",

    // Telemetry Stats
    healthIndex: "Crop Health Index",
    inspectionsCount: "Total Inspections",
    activeSchedules: "Active Schedules",
    telemetryStatus: "Telemetry Feed",

    // Camera & Controls
    liveCamFeed: "Live Camera Feed",
    streamSubtitle: "Stream and analyze leaves in real-time",
    laptopCam: "Laptop Camera",
    esp32Cam: "ESP32-CAM",
    enableRoi: "Enable Leaf ROI Crop",
    roiActive: "ROI Mode Active",
    resetRoi: "Reset ROI Box",
    captureAnalyze: "CAPTURE & ANALYZE FULL FRAME",
    analyzeRoi: "ANALYZE CROPPED ROI",
    analyzingFrame: "Analyzing Frame...",
    capturedRoi: "Captured Leaf ROI",

    // Pathology & AI
    pathologyDiagnosis: "Pathology Diagnosis",
    clinicalFindings: "Clinical Findings",
    healthy: "HEALTHY",
    diseased: "DISEASED",
    unknown: "UNKNOWN",

    // Rover Quick Controls
    quickRoverControl: "Quick Rover Control",
    ipConnectBar: "IP Connect Bar",
    connect: "Connect",
    forward: "FORWARD",
    backward: "BACKWARD",
    left: "LEFT",
    right: "RIGHT",
    stop: "STOP",
    modeManual: "MANUAL",
    modeAutonomous: "AUTONOMOUS",
  },
  hi: {
    appName: "एग्रीरोवर एआई",
    appSubtitle: "स्मार्ट फार्मिंग असिस्टेंट",
    systemStatus: "सिस्टम:",
    allSystemsNominal: "सभी प्रणाली सामान्य",
    emergencyStop: "आपातकालीन रोक",
    resetEmergency: "आपातकाल रीसेट करें",
    wsBridge: "डेटा ब्रिज",
    roverMode: "रोवर",
    online: "ऑनलाइन",
    offline: "ऑफ़लाइन",

    navDashboard: "डैशबोर्ड",
    navRoverControl: "रोवर नियंत्रण",
    navAiCropAnalysis: "एआई फसल विश्लेषण",
    navSmartIrrigation: "स्मार्ट सिंचाई",
    navEnvironment: "पर्यावरण",
    navAuditHistory: "ऑडिट और इतिहास",
    navTreatmentConfig: "उपचार कॉन्फ़िगरेशन",

    dashboardTitle: "स्मार्ट फार्मिंग डैशबोर्ड",
    dashboardSubtitle: "वास्तविक समय फसल स्वास्थ्य निगरानी और रोवर टेलीमेट्री",
    loadingDashboard: "एग्रीरोवर डैशबोर्ड लोड हो रहा है...",

    healthIndex: "फसल स्वास्थ्य सूचकांक",
    inspectionsCount: "कुल निरीक्षण",
    activeSchedules: "सक्रिय अनुसूची",
    telemetryStatus: "टेलीमेट्री फ़ीड",

    liveCamFeed: "लाइव कैमरा फ़ीड",
    streamSubtitle: "वास्तविक समय में पत्तियों का विश्लेषण करें",
    laptopCam: "लैपटॉप कैमरा",
    esp32Cam: "ESP32 कैमरा",
    enableRoi: "लीफ ROI क्रॉप चालू करें",
    roiActive: "ROI मोड सक्रिय",
    resetRoi: "ROI रीसेट करें",
    captureAnalyze: "कैप्चर और एआई विश्लेषण करें",
    analyzeRoi: "क्रॉप किए गए ROI का विश्लेषण करें",
    analyzingFrame: "फ्रेम का विश्लेषण हो रहा है...",
    capturedRoi: "कैप्चर की गई पत्ती",

    pathologyDiagnosis: "रोग निदान",
    clinicalFindings: "नैदानिक निष्कर्ष",
    healthy: "स्वस्थ",
    diseased: "रोगग्रस्त",
    unknown: "अज्ञात",

    quickRoverControl: "त्वरित रोवर नियंत्रण",
    ipConnectBar: "आईपी कनेक्ट बार",
    connect: "कनेक्ट करें",
    forward: "आगे",
    backward: "पीछे",
    left: "बाएं",
    right: "दाएं",
    stop: "रोकें",
    modeManual: "मैनुअल",
    modeAutonomous: "स्वायत्त",
  },
  te: {
    appName: "అగ్రిరోవర్ AI",
    appSubtitle: "స్మార్ట్ ఫార్మింగ్ అసిస్టెంట్",
    systemStatus: "సిస్టమ్:",
    allSystemsNominal: "అన్ని సిస్టమ్స్ సాధారణం",
    emergencyStop: "ఎమర్జెన్సీ స్టాప్",
    resetEmergency: "రీసెట్ ఎమర్జెన్సీ",
    wsBridge: "డేటా బ్రిడ్జ్",
    roverMode: "రోవర్",
    online: "ఆన్‌లైన్",
    offline: "ఆఫ్‌లైన్",

    navDashboard: "డాష్‌బోర్డ్",
    navRoverControl: "రోవర్ నియంత్రణ",
    navAiCropAnalysis: "AI పంట విశ్లేషణ",
    navSmartIrrigation: "స్మార్ట్ నీటిపారుదల",
    navEnvironment: "వాతావరణం",
    navAuditHistory: "ఆడిట్ & హిస్టరీ",
    navTreatmentConfig: "చికిత్స కాన్ఫిగరేషన్",

    dashboardTitle: "స్మార్ట్ ఫార్మింగ్ డాష్‌బోర్డ్",
    dashboardSubtitle: "రియల్ టైమ్ పంట ఆరోగ్యం & రోవర్ సమాచారం",
    loadingDashboard: "అగ్రిరోవర్ డాష్‌బోర్డ్ లోడ్ అవుతోంది...",

    healthIndex: "పంట ఆరోగ్య సూచిక",
    inspectionsCount: "మొత్తం తనిఖీలు",
    activeSchedules: "యాక్టివ్ షెడ్యూల్స్",
    telemetryStatus: "సెన్సార్ సమాచారం",

    liveCamFeed: "లైవ్ కెమెరా ఫీడ్",
    streamSubtitle: "ఆకులను రియల్ టైమ్‌లో విశ్లేషించండి",
    laptopCam: "ల్యాప్‌టాప్ కెమెరా",
    esp32Cam: "ESP32 కెమెరా",
    enableRoi: "ఆకు ROI క్రాప్ ఎనేబుల్ చేయండి",
    roiActive: "ROI మోడ్ యాక్టివ్‌గా ఉంది",
    resetRoi: "ROI రీసెట్",
    captureAnalyze: "కాప్చర్ & AI విశ్లేషణ",
    analyzeRoi: "క్రాప్ చేసిన ROI విశ్లేషణ",
    analyzingFrame: "విశ్లేషిస్తోంది...",
    capturedRoi: "కాప్చర్ చేసిన ఆకు",

    pathologyDiagnosis: "వ్యాధి నిర్ధారణ",
    clinicalFindings: "లక్షణాలు",
    healthy: "ఆరోగ్యంగా ఉంది",
    diseased: "వ్యాధిగ్రస్థమైనది",
    unknown: "తెలియదు",

    quickRoverControl: "త్వరిత రోవర్ కంట్రోల్",
    ipConnectBar: "IP కనెక్ట్ బార్",
    connect: "కనెక్ట్",
    forward: "ముందుకు",
    backward: "వెనుకకు",
    left: "ఎడమకు",
    right: "కుడికి",
    stop: "ఆపు",
    modeManual: "మాన్యువల్",
    modeAutonomous: "ఆటోనామస్",
  },
  ta: {
    appName: "அக்ரிரோவர் AI",
    appSubtitle: "ஸ்மார்ட் விவசாய உதவியாளர்",
    systemStatus: "அமைப்பு:",
    allSystemsNominal: "அனைத்து அமைப்புகளும் இயல்பு",
    emergencyStop: "அவசர நிறுத்தம்",
    resetEmergency: "மீட்டமைக்க அவசரம்",
    wsBridge: "தரவு பாலம்",
    roverMode: "ரோவர்",
    online: "ஆன்லைன்",
    offline: "ஆஃப்லைன்",

    navDashboard: "டாஷ்போர்டு",
    navRoverControl: "ரோவர் கட்டுப்பாடு",
    navAiCropAnalysis: "AI பயிர் பகுப்பாய்வு",
    navSmartIrrigation: "ஸ்மார்ட் பாசனம்",
    navEnvironment: "சுற்றுச்சூழல்",
    navAuditHistory: "தணிக்கை & வரலாறு",
    navTreatmentConfig: "சிகிச்சை அமைப்பு",

    dashboardTitle: "ஸ்மார்ட் விவசாய டாஷ்போர்டு",
    dashboardSubtitle: "நேரடி பயிர் ஆரோக்கிய கண்காணிப்பு",
    loadingDashboard: "டாஷ்போர்டு ஏற்றப்படுகிறது...",

    healthIndex: "பயிர் ஆரோக்கிய குறியீடு",
    inspectionsCount: "மொத்த ஆய்வுகள்",
    activeSchedules: "செயலில் உள்ள அட்டவணைகள்",
    telemetryStatus: "தொலைத்தொடர்பு தரவு",

    liveCamFeed: "நேரடி கேமரா",
    streamSubtitle: "இலைகளை பகுப்பாய்வு செய்யுங்கள்",
    laptopCam: "லேப்டாப் கேமரா",
    esp32Cam: "ESP32 கேமரா",
    enableRoi: "ROI பயிர் இயக்கவும்",
    roiActive: "ROI பயன்முறை செயலில்",
    resetRoi: "ROI மீட்டமைக்க",
    captureAnalyze: "படம் எடுத்து AI பகுப்பாய்வு செய்",
    analyzeRoi: "வெட்டப்பட்ட ROI பகுப்பாய்வு",
    analyzingFrame: "பகுப்பாய்வு செய்கிறது...",
    capturedRoi: "பிடிக்கப்பட்ட இலை",

    pathologyDiagnosis: "நோய் கண்டறிதல்",
    clinicalFindings: "மருத்துவ கண்டுபிடிப்புகள்",
    healthy: "ஆரோக்கியமானது",
    diseased: "பாதிக்கப்பட்டது",
    unknown: "தெரியவில்லை",

    quickRoverControl: "வேகமான ரோவர் கட்டுப்பாடு",
    ipConnectBar: "IP இணைப்பு பட்டா",
    connect: "இணைக்கவும்",
    forward: "முன்னோக்கி",
    backward: "பின்னோக்கி",
    left: "இடது",
    right: "வலது",
    stop: "நிறுத்து",
    modeManual: "கையேடு",
    modeAutonomous: "தன்னிச்சையான",
  },
  mr: {
    appName: "एग्रीरोव्हर AI",
    appSubtitle: "स्मार्ट शेती सहाय्यक",
    systemStatus: "सिस्टम:",
    allSystemsNominal: "सर्व प्रणाली सामान्य",
    emergencyStop: "आणीबाणी थांबवा",
    resetEmergency: "आणीबाणी रिसेट करा",
    wsBridge: "डेटा ब्रिज",
    roverMode: "रोव्हर",
    online: "ऑनलाइन",
    offline: "ऑफलाइन",

    navDashboard: "डॅशबोर्ड",
    navRoverControl: "रोव्हर नियंत्रण",
    navAiCropAnalysis: "AI पीक विश्लेषण",
    navSmartIrrigation: "स्मार्ट सिंचन",
    navEnvironment: "पर्यावरण",
    navAuditHistory: "ऑडिट आणि इतिहास",
    navTreatmentConfig: "उपचार कॉन्फिगरेशन",

    dashboardTitle: "स्मार्ट शेती डॅशबोर्ड",
    dashboardSubtitle: "रिअल-टाइम पीक आरोग्य देखरेख",
    loadingDashboard: "डॅशबोर्ड लोड होत आहे...",

    healthIndex: "पीक आरोग्य निर्देशांक",
    inspectionsCount: "एकूण तपासण्या",
    activeSchedules: "सक्रिय वेळापत्रक",
    telemetryStatus: "टेलिमेट्री फीड",

    liveCamFeed: "लाइव्ह कॅमेरा फीड",
    streamSubtitle: "पानांचे रिअल-टाइम विश्लेषण करा",
    laptopCam: "लॅपटॉप कॅमेरा",
    esp32Cam: "ESP32 कॅमेरा",
    enableRoi: "ROI क्रॉप सुरू करा",
    roiActive: "ROI मोड सक्रिय",
    resetRoi: "ROI रिसेट करा",
    captureAnalyze: "कॅप्चर आणि AI विश्लेषण",
    analyzeRoi: "क्रॉप केलेल्या ROI चे विश्लेषण",
    analyzingFrame: "विश्लेषण होत आहे...",
    capturedRoi: "कॅप्चर केलेले पान",

    pathologyDiagnosis: "रोग निदान",
    clinicalFindings: "वैद्यकीय निष्कर्ष",
    healthy: "निरोगी",
    diseased: "रोगग्रस्त",
    unknown: "अज्ञात",

    quickRoverControl: "जलद रोव्हर नियंत्रण",
    ipConnectBar: "IP कनेक्ट बार",
    connect: "कनेक्ट करा",
    forward: "पुढे",
    backward: "मागे",
    left: "डावीकडे",
    right: "उजवीकडे",
    stop: "थांबा",
    modeManual: "मॅन्युअल",
    modeAutonomous: "स्वायत्त",
  },
  kn: {
    appName: "ಅಗ್ರಿರೋವರ್ AI",
    appSubtitle: "ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಸಹಾಯಕ",
    systemStatus: "ಸಿಸ್ಟಮ್:",
    allSystemsNominal: "ಎಲ್ಲಾ ಸಿಸ್ಟಮ್ ಸಾಮಾನ್ಯ",
    emergencyStop: "ತುರ್ತು ನಿಲ್ಲಿಸು",
    resetEmergency: "ತುರ್ತು ರಿಸೆಟ್",
    wsBridge: "ಡೇಟಾ ಸೇತುವೆ",
    roverMode: "ರೋವರ್",
    online: "ಆನ್‌ಲೈನ್",
    offline: "ಆಫ್‌ಲೈನ್",

    navDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    navRoverControl: "ರೋವರ್ ನಿಯಂತ್ರಣ",
    navAiCropAnalysis: "AI ಬೆಳೆ ವಿಶ್ಲೇಷಣೆ",
    navSmartIrrigation: "ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ",
    navEnvironment: "ಪರಿಸರ",
    navAuditHistory: "ಆಡಿಟ್ ಮತ್ತು ಇತಿಹಾಸ",
    navTreatmentConfig: "ಚಿಕಿತ್ಸಾ ಸಂರಚನೆ",

    dashboardTitle: "ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    dashboardSubtitle: "ನೈಜ-ಸಮಯದ ಬೆಳೆ ಆರೋಗ್ಯ ಮೇಲ್ವಿಚಾರಣೆ",
    loadingDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ...",

    healthIndex: "ಬೆಳೆ ಆರೋಗ್ಯ ಸೂಚ್ಯಂಕ",
    inspectionsCount: "ಒಟ್ಟು ತಪಾಸಣೆಗಳು",
    activeSchedules: "ಸಕ್ರಿಯ ವೇಳಾಪಟ್ಟಿಗಳು",
    telemetryStatus: "ಟೆಲಿಮೆಟ್ರಿ ಮಾಹಿತಿ",

    liveCamFeed: "ಲೈವ್ ಕ್ಯಾಮೆರಾ ಫೀಡ್",
    streamSubtitle: "ಎಲೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ",
    laptopCam: "ಲ್ಯಾಪ್ಟಾಪ್ ಕ್ಯಾಮೆರಾ",
    esp32Cam: "ESP32 ಕ್ಯಾಮೆರಾ",
    enableRoi: "ROI ಕ್ರಾಪ್ ಸಕ್ರಿಯಗೊಳಿಸಿ",
    roiActive: "ROI ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ",
    resetRoi: "ROI ರಿಸೆಟ್",
    captureAnalyze: "ಕ್ಯಾಪ್ಚರ್ ಮತ್ತು AI ವಿಶ್ಲೇಷಣೆ",
    analyzeRoi: "ಕ್ರಾಪ್ ಮಾಡಿದ ROI ವಿಶ್ಲೇಷಿಸಿ",
    analyzingFrame: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
    capturedRoi: "ಕ್ಯಾಪ್ಚರ್ ಮಾಡಿದ ಎಲೆ",

    pathologyDiagnosis: "ರೋಗ ನಿರ್ಣಯ",
    clinicalFindings: "ರೋಗ ಲಕ್ಷಣಗಳು",
    healthy: "ಆರೋಗ್ಯಕರ",
    diseased: "ರೋಗಪೀಡಿತ",
    unknown: "ತಿಳಿದಿಲ್ಲ",

    quickRoverControl: "ತ್ವರಿತ ರೋವರ್ ನಿಯಂತ್ರಣ",
    ipConnectBar: "IP ಸಂಪರ್ಕ ಬಾರ್",
    connect: "ಸಂಪರ್ಕಿಸಿ",
    forward: "ಮುಂದಕ್ಕೆ",
    backward: "ಹಿಂಭಾಗ",
    left: "ಎಡಕ್ಕೆ",
    right: "ಬಲಕ್ಕೆ",
    stop: "ನಿಲ್ಲಿಸು",
    modeManual: "ಮ್ಯಾನುಯಲ್",
    modeAutonomous: "ಸ್ವಾಯತ್ತ",
  },
  bn: {
    appName: "এগ্রিরোভার AI",
    appSubtitle: "স্মার্ট কৃষি সহকারী",
    systemStatus: "সিস্টেম:",
    allSystemsNominal: "সমস্ত সিস্টেম স্বাভাবিক",
    emergencyStop: "জরুরি স্টপ",
    resetEmergency: "রিসেট জরুরি অবস্থা",
    wsBridge: "ডাটা ব্রিজ",
    roverMode: "রোভার",
    online: "অনলাইন",
    offline: "অফলাইন",

    navDashboard: "ড্যাশবোর্ড",
    navRoverControl: "রোভার নিয়ন্ত্রণ",
    navAiCropAnalysis: "AI ফসল বিশ্লেষণ",
    navSmartIrrigation: "স্মার্ট সেচ",
    navEnvironment: "পরিবেশ",
    navAuditHistory: "অডিট ও ইতিহাস",
    navTreatmentConfig: "চিকিৎসা কনফিগারেশন",

    dashboardTitle: "স্মার্ট কৃষি ড্যাশবোর্ড",
    dashboardSubtitle: "রিয়েল-টাইম ফসলের স্বাস্থ্য পর্যবেক্ষণ",
    loadingDashboard: "ড্যাশবোর্ড লোড হচ্ছে...",

    healthIndex: "ফসল স্বাস্থ্য সূচক",
    inspectionsCount: "মোট পরিদর্শন",
    activeSchedules: "সক্রিয় সময়সূচী",
    telemetryStatus: "টেলিমেট্রি ফিড",

    liveCamFeed: "লাইভ ক্যামেরা ফিড",
    streamSubtitle: "পাতার রিয়েল-টাইম বিশ্লেষণ করুন",
    laptopCam: "ল্যাপটপ ক্যামেরা",
    esp32Cam: "ESP32 ক্যামেরা",
    enableRoi: "ROI ক্রপ চালু করুন",
    roiActive: "ROI মোড সক্রিয়",
    resetRoi: "ROI রিসেট",
    captureAnalyze: "ক্যাপচার ও AI বিশ্লেষণ",
    analyzeRoi: "ক্রপ করা ROI বিশ্লেষণ করুন",
    analyzingFrame: "বিশ্লেষণ করা হচ্ছে...",
    capturedRoi: "ক্যাপচার করা পাতা",

    pathologyDiagnosis: "রোগ নির্ণয়",
    clinicalFindings: "রোগের লক্ষণ",
    healthy: "সুস্থ",
    diseased: "রোগাক্রান্ত",
    unknown: "অজানা",

    quickRoverControl: "দ্রুত রোভার নিয়ন্ত্রণ",
    ipConnectBar: "IP সংযোগ বার",
    connect: "সংযুক্ত করুন",
    forward: "সামনে",
    backward: "পিছনে",
    left: "বামে",
    right: "ডানে",
    stop: "থামুন",
    modeManual: "ম্যানুয়াল",
    modeAutonomous: "স্বায়ত্তশাসিত",
  },
  gu: {
    appName: "એગ્રીરોવર AI",
    appSubtitle: "સ્માર્ટ ફાર્મિંગ આસિસ્ટન્ટ",
    systemStatus: "સિસ્ટમ:",
    allSystemsNominal: "બધી સિસ્ટમ સામાન્ય",
    emergencyStop: "ઇમરજન્સી સ્ટોપ",
    resetEmergency: "રીસેટ ઇમરજન્સી",
    wsBridge: "ડેટા બ્રિજ",
    roverMode: "રોવર",
    online: "ઓનલાઇન",
    offline: "ઓફલાઇન",

    navDashboard: "ડેશબોર્ડ",
    navRoverControl: "રોવર કંટ્રોલ",
    navAiCropAnalysis: "AI પાક વિશ્લેષણ",
    navSmartIrrigation: "સ્માર્ટ સિંચાઈ",
    navEnvironment: "પર્યાવરણ",
    navAuditHistory: "ઓડિટ અને ઇતિહાસ",
    navTreatmentConfig: "સારવાર કન્ફિગરેશન",

    dashboardTitle: "સ્માર્ટ ફાર્મિંગ ડેશબોર્ડ",
    dashboardSubtitle: "રિયલ-ટાઇમ પાક આરોગ્ય નિરીક્ષણ",
    loadingDashboard: "ડેશબોર્ડ લોડ થઈ રહ્યું છે...",

    healthIndex: "પાક આરોગ્ય ઇન્ડેક્સ",
    inspectionsCount: "કુલ નિરીક્ષણો",
    activeSchedules: "સક્રિય સમયપત્રક",
    telemetryStatus: "ટેલિમેટ્રી ફીડ",

    liveCamFeed: "લાઇવ કેમેરા ફીડ",
    streamSubtitle: "પાંદડાનું વિશ્લેષણ કરો",
    laptopCam: "લેપટોપ કેમેરા",
    esp32Cam: "ESP32 કેમેરા",
    enableRoi: "ROI ક્રોપ સક્ષમ કરો",
    roiActive: "ROI મોડ સક્રિય",
    resetRoi: "ROI રીસેટ કરો",
    captureAnalyze: "કેપ્ચર અને AI વિશ્લેષણ",
    analyzeRoi: "ક્રોપ કરેલ ROI વિશ્લેષણ",
    analyzingFrame: "વિશ્લેષણ થઈ રહ્યું છે...",
    capturedRoi: "કેપ્ચર કરેલ પાંદડું",

    pathologyDiagnosis: "રોગ નિદાન",
    clinicalFindings: "નિદાન વિગતો",
    healthy: "તંદુરસ્ત",
    diseased: "રોગગ્રસ્ત",
    unknown: "અજ્ઞાત",

    quickRoverControl: "ઝડપી રોવર નિયંત્રણ",
    ipConnectBar: "IP કનેક્ટ બાર",
    connect: "કનેક્ટ કરો",
    forward: "આગળ",
    backward: "પાછળ",
    left: "ડાબે",
    right: "જમણે",
    stop: "રોકો",
    modeManual: "મેન્યુઅલ",
    modeAutonomous: "સ્વાયત્ત",
  },
  ml: {
    appName: "അഗ്രിറോവർ AI",
    appSubtitle: "സ്മാർട്ട് ഫാർമിംഗ് അസിസ്റ്റന്റ്",
    systemStatus: "സിസ്റ്റം:",
    allSystemsNominal: "എല്ലാ സിസ്റ്റങ്ങളും സാധാരണമാണ്",
    emergencyStop: "അടിയന്തര സ്റ്റോപ്പ്",
    resetEmergency: "റീസെറ്റ് ചെയ്യുക",
    wsBridge: "ഡാറ്റാ ബ്രിഡ്ജ്",
    roverMode: "റോവർ",
    online: "ഓൺലൈൻ",
    offline: "ഓഫ്‌ലൈൻ",

    navDashboard: "ഡാഷ്‌ബോർഡ്",
    navRoverControl: "റോവർ നിയന്ത്രണം",
    navAiCropAnalysis: "AI വിള വിശകലനം",
    navSmartIrrigation: "സ്മാർട്ട് ജലസേചനം",
    navEnvironment: "പരിസ്ഥിതി",
    navAuditHistory: "ഓഡിറ്റ് & ഹിസ്റ്ററി",
    navTreatmentConfig: "ചികിത്സാ ക്രമീകരണം",

    dashboardTitle: "സ്മാർട്ട് ഫാർമിംഗ് ഡാഷ്‌ബോർഡ്",
    dashboardSubtitle: "തത്സമയ വിള ആരോഗ്യ നിരീക്ഷണം",
    loadingDashboard: "ഡാഷ്‌ബോർഡ് ലോഡ് ചെയ്യുന്നു...",

    healthIndex: "വിള ആരോഗ്യ സൂചിക",
    inspectionsCount: "ആകെ പരിശോധനകൾ",
    activeSchedules: "സജീവ ഷെഡ്യൂളുകൾ",
    telemetryStatus: "ടെലിമെട്രി ഡാറ്റ",

    liveCamFeed: "ലൈവ് ക്യാമറ ഫീഡ്",
    streamSubtitle: "ഇലകൾ തത്സമയം വിശകലനം ചെയ്യുക",
    laptopCam: "ലാപ്‌ടോപ്പ് ക്യാമറ",
    esp32Cam: "ESP32 ക്യാമറ",
    enableRoi: "ROI ക്രോപ്പ് ഉപയോഗിക്കുക",
    roiActive: "ROI മോഡ് സജീവമാണ്",
    resetRoi: "ROI റീസെറ്റ് ചെയ്യുക",
    captureAnalyze: "ചിത്രമെടുത്ത് AI വിശകലനം ചെയ്യുക",
    analyzeRoi: "ക്രോപ്പ് ചെയ്ത ROI വിശകലനം ചെയ്യുക",
    analyzingFrame: "വിശകലനം ചെയ്യുന്നു...",
    capturedRoi: "എടുത്ത ഇല",

    pathologyDiagnosis: "രോഗനിർണയം",
    clinicalFindings: "ലക്ഷണങ്ങൾ",
    healthy: "ആരോഗ്യമുള്ളത്",
    diseased: "രോഗം ബാധിച്ചത്",
    unknown: "അജ്ഞാതം",

    quickRoverControl: "റോവർ ദ്രുത നിയന്ത്രണം",
    ipConnectBar: "IP കണക്ട് ബാർ",
    connect: "കണക്ട് ചെയ്യുക",
    forward: "മുന്നോട്ട്",
    backward: "പിന്നോട്ട്",
    left: "ഇടത്തോട്ട്",
    right: "വലത്തോട്ട്",
    stop: "നിർത്തുക",
    modeManual: "മാനുവൽ",
    modeAutonomous: "സ്വയം നിയന്ത്രിതം",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('agrirover_lang') as Language;
    if (saved && translations[saved]) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('agrirover_lang', lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

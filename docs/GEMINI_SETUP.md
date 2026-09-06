# Google Gemini API Setup & Rate Limit Protection Guide

## Key Security Requirements
- The `GEMINI_API_KEY` must **NEVER** be hardcoded or included in ESP32 firmware, Next.js frontend code, or public GitHub repositories.
- Only the FastAPI backend service communicates directly with Google Gemini.

## Obtaining API Key
1. Obtain an API key from Google AI Studio (`https://aistudio.google.com/`).
2. Add your key to `backend/.env`:
```bash
GEMINI_API_KEY="AIzaSyYourActualGeminiApiKeyHere"
```

## Rate Limiting & Safety Engine Policy
1. **Frame Sampling**: Only 1 stable still photo per plant stop is analyzed by Gemini. Moving live stream frames are never sent to Gemini.
2. **Fail-Closed Protection**: If Gemini returns `UNKNOWN`, low confidence ($<60\%$), or API quota error, the backend enforces `NO_SPRAY`.

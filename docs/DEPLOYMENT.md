# Deployment Instructions

## 1. Local Monorepo Startup
- **Backend Server**:
  ```bash
  cd backend
  python -m venv venv
  .\venv\Scripts\pip install -r requirements.txt
  .\venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000
  ```
- **Frontend App**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- Open browser at `http://localhost:3000`.

## 2. Cloud Deployment Target
- **Frontend**: Deploy `frontend/` to Vercel. Set `NEXT_PUBLIC_API_URL` to Render backend URL.
- **Backend**: Deploy `backend/` to Render or Railway. Set environment variables `GEMINI_API_KEY`, `DATABASE_URL`, `MQTT_BROKER`.
- **Database**: Supabase PostgreSQL (run `database/schema.sql` in SQL Editor).

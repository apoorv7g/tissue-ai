# Tissue AI — Next.js Frontend

React/Next.js rewrite of the UI. The FastAPI backend runs unchanged.

## Setup

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

The FastAPI backend must be running on port 8000:
```bash
cd ..
uvicorn backend.app.main:app --reload --port 8000
```

All `/api/*`, `/auth/*`, and `/static/*` requests are proxied from Next.js → FastAPI automatically via `next.config.js`.

## Environment

Create `frontend/.env.local` to point at a non-default backend:
```
API_URL=http://localhost:8000
```

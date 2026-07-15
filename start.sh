#!/usr/bin/env bash
# FinTrack — One-shot startup script
# Usage: ./start.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Start backend
echo "🚀 Starting FastAPI backend on http://localhost:8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "⚡ Starting Vite frontend on http://localhost:5173 ..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ FinTrack is running!"
echo "   Frontend → http://localhost:5173"
echo "   Backend  → http://localhost:8000"
echo "   API Docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT INT TERM
wait

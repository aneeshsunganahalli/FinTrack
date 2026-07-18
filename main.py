"""
FinTrack — Personal Finance Tracker
FastAPI entrypoint. Run with: uvicorn main:app --reload --port 8000
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.models import init_db
from backend.routes import (
    transactions_router, accounts_router, wishlist_router,
    investments_router, categories_router, dashboard_router,
    settings_router, import_router, llm_router, subscriptions_router,
    debts_router
)

app = FastAPI(
    title="Jarvis",
    description="Local Personal Finance Tracker",
    version="1.0.0",
)

# ─── CORS (allow Vite dev server) ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import asyncio
from backend.models import init_db, SessionLocal
from backend.routes.subscriptions import process_due_subscriptions
from backend.routes.investments import refresh_investment_prices

async def background_worker():
    while True:
        try:
            db = SessionLocal()
            try:
                process_due_subscriptions(db)
                refresh_investment_prices(db)
            finally:
                db.close()
        except Exception as e:
            print(f"Background worker error: {e}")
        # Run every 12 hours
        await asyncio.sleep(12 * 3600)

# ─── Init DB on startup ───────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()
    asyncio.create_task(background_worker())


# ─── API routes ───────────────────────────────────────────────────────────────
app.include_router(dashboard_router)
app.include_router(transactions_router)
app.include_router(accounts_router)
app.include_router(wishlist_router)
app.include_router(investments_router)
app.include_router(categories_router)
app.include_router(settings_router)
app.include_router(import_router)
app.include_router(llm_router)
app.include_router(subscriptions_router)
app.include_router(debts_router)


# ─── Serve built frontend (production) ───────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        index = os.path.join(FRONTEND_DIST, "index.html")
        return FileResponse(index)


@app.get("/", include_in_schema=False)
def root():
    if os.path.isdir(FRONTEND_DIST):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
    return {"message": "Jarvis API running. Start the Vite dev server for the UI."}

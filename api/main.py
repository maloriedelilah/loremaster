"""
Loremaster — FastAPI Application
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, AsyncSessionLocal
from app.config import settings
from app.services.auth import ensure_superadmin
from app.routers import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown."""
    print("Loremaster API starting up...")
    await init_db()
    print("Database initialized.")

    # Bootstrap superadmin
    async with AsyncSessionLocal() as db:
        await ensure_superadmin(db)

    yield
    print("Loremaster API shutting down...")


app = FastAPI(
    title="Loremaster API",
    description="Lore universe management system",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the authors React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Production nginx
        "https://loremaster.aeon14.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "loremaster"}


# Register routers
app.include_router(auth.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)
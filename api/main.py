"""
Loremaster — FastAPI Application
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, AsyncSessionLocal
from app.config import settings
from app.services.auth import ensure_superadmin
from app.routers import auth, tenants, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown."""
    print("Loremaster API starting up...")
    await init_db()
    print("Database initialized.")

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://loremaster.aeon14.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "loremaster"}


app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(users.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)
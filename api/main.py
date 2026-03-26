"""
Loremaster — FastAPI Application
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import AsyncSessionLocal
from app.config import settings
from app.services.auth import ensure_superadmin
from app.routers import auth, tenants, users, universes, books


def run_migrations():
    """Run alembic migrations on startup."""
    from alembic.config import Config
    from alembic import command
    import os

    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
    alembic_cfg.set_main_option(
        "sqlalchemy.url",
        settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    )
    command.upgrade(alembic_cfg, "head")
    print("Database migrations complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loremaster API starting up...")
    run_migrations()
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
app.include_router(universes.router)
app.include_router(books.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)
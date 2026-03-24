"""
Loremaster — Configuration
Loads settings from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Superadmin
    SUPERADMIN_EMAIL: str
    SUPERADMIN_PASSWORD: str

    # Chunkinator Service
    CHUNKINATOR_BASE_URL: str
    CHUNKINATOR_SERVICE_KEY: str

    # Loreinator
    LOREINATOR_BASE_URL: str
    LOREINATOR_API_KEY: str

    # AnythingLLM
    ANYTHINGLLM_BASE_URL: str
    ANYTHINGLLM_API_KEY: str

    # Debug
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
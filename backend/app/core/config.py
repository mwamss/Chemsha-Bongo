import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Chemsha Bongo API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000

    # Security
    SECRET_KEY: str = "chemsha_bongo_insecure_dev_secret_key_change_in_production_32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    ALGORITHM: str = "HS256"
    
    # CSRF Protection
    CSRF_SECRET: str = "chemsha_bongo_csrf_insecure_dev_secret_change_me"
    CSRF_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    
    # Cookie Configuration
    COOKIE_NAME: str = "chemsha_session"
    COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Union[str, None] = None
    
    # Database
    DATABASE_URL: str = "sqlite:///./chemsha_dev.db"  # Defaults to local SQLite if Postgres not set
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5500",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Game Mechanics & Validation
    CHALLENGE_TIMEZONE: str = "UTC"
    DAILY_BLITZ_ROUNDS_REQUIRED: int = 3
    MAX_THEORETICAL_SCORE_PER_ROUND: int = 5000
    MAX_THEORETICAL_STREAK_PER_ROUND: int = 50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

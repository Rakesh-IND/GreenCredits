from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    # Application Info
    APP_NAME: str = "Green Credits"
    API_V1_STR: str = "/api"

    # Security
    SECRET_KEY: str = "supersecretkey_for_green_credits" # Should be overridden in prod
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # CORS Configuration
    CORS_ORIGINS: List[str] = ["*"] # E.g., ["http://localhost", "http://localhost:5173", "https://your-netlify-app.netlify.app"]

    # Database Configuration
    DATABASE_URL: str = "sqlite:///./green_credits.db"

    # Allows fetching from .env file
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

settings = Settings()

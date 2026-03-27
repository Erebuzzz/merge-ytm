from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "YTMusic Sync API"
    app_version: str = "0.1.0"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ytmusic_sync"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "replace-this-with-a-long-random-secret"
    frontend_url: str = "http://localhost:3000"
    debug: bool = True
    max_playlist_links: int = 5
    liked_songs_limit: int = 5000
    total_tracks_limit: int = 50
    max_tracks_per_section: int = 20
    ytmusic_retry_attempts: int = 3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Merge"
    app_version: str = "0.1.0"
    database_url: str = (
        "postgresql+pg8000://postgres:postgres@localhost:5432/ytmusic_sync"
    )
    redis_url: str = ""
    secret_key: str = "replace-this-with-a-long-random-secret"
    frontend_url: str = "*"
    debug: bool = True
    max_playlist_links: int = 5
    liked_songs_limit: int = 5000
    total_tracks_limit: int = 50
    max_tracks_per_section: int = 20
    ytmusic_retry_attempts: int = 3
    # Google OAuth for YouTube Music
    google_client_id: str = ""
    google_client_secret: str = ""
    youtube_oauth_redirect_uri: str = "http://localhost:8000/auth/youtube/callback"
    # Feedback boost deltas (configurable)
    feedback_like_boost: float = 10.0
    feedback_dislike_penalty: float = 10.0
    feedback_skip_penalty: float = 5.0

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

from __future__ import annotations

from app.core.config import get_settings

settings = get_settings()

# Only register Celery tasks when Redis is configured (not on Vercel serverless)
if settings.redis_url:
    from app.core.celery_app import celery_app
    from app.db.session import SessionLocal
    from app.schemas.api import BlendGenerateRequest, YTMusicPlaylistCreateRequest
    from app.services.blend_service import BlendService

    @celery_app.task(name="ytmusic_sync.fetch_playlist_sources")
    def fetch_playlist_sources_task(blend_id: str) -> dict:
        with SessionLocal() as db:
            service = BlendService(db)
            response = service.fetch_sources(blend_id)
            return response.model_dump(by_alias=True)

    @celery_app.task(name="ytmusic_sync.generate_blend")
    def generate_blend_task(blend_id: str) -> dict:
        with SessionLocal() as db:
            service = BlendService(db)
            response = service.generate_blend(BlendGenerateRequest(blendId=blend_id))
            return response.model_dump(by_alias=True)

    @celery_app.task(name="ytmusic_sync.create_playlist")
    def create_playlist_task(blend_id: str, user_id: str, title: str, description: str | None = None) -> dict:
        with SessionLocal() as db:
            service = BlendService(db)
            response = service.create_ytmusic_playlist(
                YTMusicPlaylistCreateRequest(
                    blendId=blend_id,
                    userId=user_id,
                    title=title,
                    description=description,
                )
            )
            return response.model_dump(by_alias=True)
else:
    # Provide dummy references so route imports don't crash
    def fetch_playlist_sources_task(*args, **kwargs):  # type: ignore
        raise RuntimeError("Celery is not configured — use sync mode instead.")

    def generate_blend_task(*args, **kwargs):  # type: ignore
        raise RuntimeError("Celery is not configured — use sync mode instead.")

    def create_playlist_task(*args, **kwargs):  # type: ignore
        raise RuntimeError("Celery is not configured — use sync mode instead.")


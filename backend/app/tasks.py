from __future__ import annotations

from app.core.config import get_settings

settings = get_settings()

# Only register Celery tasks when Redis is configured (not on Vercel serverless)
if settings.redis_url:
    from app.core.celery_app import celery_app
    from app.db.session import SessionLocal
    from app.models import Blend, Job
    from app.schemas.api import BlendGenerateRequest, YTMusicPlaylistCreateRequest
    from app.services.blend_service import BlendService

    def _create_job(db, job_type: str, blend_id: str, owner_id: str | None, celery_task_id: str | None = None) -> Job:
        """Create a Job record with status=running, progress=0."""
        if owner_id is None:
            blend = db.get(Blend, blend_id)
            owner_id = blend.participant_a_id if blend else None
        job = Job(
            job_type=job_type,
            status="running",
            progress=0,
            blend_id=blend_id,
            owner_id=owner_id,
            celery_task_id=celery_task_id,
        )
        db.add(job)
        db.flush()
        return job

    @celery_app.task(name="merge.fetch_playlist_sources", bind=True)
    def fetch_playlist_sources_task(self, blend_id: str, owner_id: str | None = None) -> dict:
        with SessionLocal() as db:
            job = _create_job(db, "fetch", blend_id, owner_id, self.request.id)
            db.commit()
            try:
                service = BlendService(db)
                response = service.fetch_sources(blend_id)
                job.progress = 100
                job.status = "done"
                db.commit()
                result = response.model_dump(by_alias=True)
                result["jobId"] = job.id
                return result
            except Exception as exc:
                job.status = "failed"
                job.error_message = str(exc)
                db.commit()
                raise

    @celery_app.task(name="merge.generate_blend", bind=True)
    def generate_blend_task(self, blend_id: str, owner_id: str | None = None) -> dict:
        with SessionLocal() as db:
            job = _create_job(db, "generate", blend_id, owner_id, self.request.id)
            db.commit()
            try:
                service = BlendService(db)
                response = service.generate_blend(BlendGenerateRequest(blendId=blend_id))
                job.progress = 100
                job.status = "done"
                db.commit()
                result = response.model_dump(by_alias=True)
                result["jobId"] = job.id
                return result
            except Exception as exc:
                job.status = "failed"
                job.error_message = str(exc)
                db.commit()
                raise

    @celery_app.task(name="merge.create_playlist", bind=True)
    def create_playlist_task(self, blend_id: str, user_id: str, title: str, description: str | None = None, owner_id: str | None = None) -> dict:
        with SessionLocal() as db:
            job = _create_job(db, "export", blend_id, owner_id or user_id, self.request.id)
            db.commit()
            try:
                service = BlendService(db)
                response = service.create_ytmusic_playlist(
                    YTMusicPlaylistCreateRequest(
                        blendId=blend_id,
                        userId=user_id,
                        title=title,
                        description=description,
                    )
                )
                job.progress = 100
                job.status = "done"
                db.commit()
                result = response.model_dump(by_alias=True)
                result["jobId"] = job.id
                return result
            except Exception as exc:
                job.status = "failed"
                job.error_message = str(exc)
                db.commit()
                raise

else:
    # Provide dummy references so route imports don't crash
    def fetch_playlist_sources_task(*args, **kwargs):  # type: ignore
        raise RuntimeError("Celery is not configured — use sync mode instead.")

    def generate_blend_task(*args, **kwargs):  # type: ignore
        raise RuntimeError("Celery is not configured — use sync mode instead.")

    def create_playlist_task(*args, **kwargs):  # type: ignore
        raise RuntimeError("Celery is not configured — use sync mode instead.")

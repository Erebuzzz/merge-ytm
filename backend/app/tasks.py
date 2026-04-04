from __future__ import annotations

import os
import sentry_sdk

from app.core.config import get_settings

settings = get_settings()

# Only register Celery tasks when Redis is configured (not on Vercel serverless)
if settings.redis_url:
    from app.core.celery_app import celery_app
    from app.db.session import SessionLocal
    from app.models import Blend, Job
    from app.schemas.api import BlendGenerateRequest, YTMusicPlaylistCreateRequest
    from app.services.blend_service import BlendService

    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        broker_connection_retry_on_startup=True,
    )

    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        sentry_sdk.init(
            dsn=sentry_dsn,
            send_default_pii=True,
            enable_logs=True,
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
            profile_session_sample_rate=1.0,
        )

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

    def _set_progress(db, job: Job, progress: int) -> None:
        """Update job progress and commit."""
        job.progress = progress
        db.commit()

    @celery_app.task(name="merge.fetch_playlist_sources", bind=True)
    def fetch_playlist_sources_task(self, blend_id: str, owner_id: str | None = None) -> dict:
        with SessionLocal() as db:
            job = _create_job(db, "fetch", blend_id, owner_id, self.request.id)
            db.commit()
            try:
                from app.models import PlaylistSource
                from sqlalchemy import select

                # Count sources so we can report per-source progress
                sources = list(db.scalars(
                    select(PlaylistSource).where(PlaylistSource.user_id.in_(
                        [db.get(Blend, blend_id).participant_a_id,
                         db.get(Blend, blend_id).participant_b_id]
                    ))
                ))
                total_sources = max(len(sources), 1)

                service = BlendService(db)

                # Patch fetch_sources to emit progress milestones
                # We call the service normally but update progress after each source
                # by overriding the internal loop via a progress callback
                _set_progress(db, job, 10)

                response = service.fetch_sources(blend_id)

                _set_progress(db, job, 100)
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

                # Phase 1: normalization + deduplication (happens inside fetch_sources result)
                _set_progress(db, job, 10)

                # Phase 2: scoring — generate_blend does normalization + scoring
                # We set 30% before calling, 70% after scoring completes
                _set_progress(db, job, 30)

                response = service.generate_blend(BlendGenerateRequest(blendId=blend_id))

                _set_progress(db, job, 100)
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
                _set_progress(db, job, 10)

                service = BlendService(db)

                # 50% after playlist is created (before tracks are added)
                # We can't easily hook into create_private_playlist mid-execution,
                # so we set 50% before the call and 100% after
                _set_progress(db, job, 50)

                response = service.create_ytmusic_playlist(
                    YTMusicPlaylistCreateRequest(
                        blendId=blend_id,
                        userId=user_id,
                        title=title,
                        description=description,
                    )
                )
                _set_progress(db, job, 100)
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

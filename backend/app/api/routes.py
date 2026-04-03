from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.auth_middleware import get_current_user
from app.core.config import get_settings
from app.core.security import decrypt_auth_payload, encrypt_auth_payload, validate_auth_file_size
from app.db.session import get_db
from app.models import Blend, Job, User
from app.schemas.api import (
    BlendCreateRequest,
    BlendCreateResponse,
    BlendDetailResponse,
    BlendFeedbackRequest,
    BlendGenerateRequest,
    PlaylistFetchRequest,
    PlaylistFetchResponse,
    TrackFeedbackRequest,
    YTMusicPlaylistCreateRequest,
    YTMusicPlaylistCreateResponse,
)
from app.services.blend_service import BlendService
from app.services.feedback_service import FeedbackService
from app.services.ytmusic_client import YTMusicService
from app.tasks import fetch_playlist_sources_task, generate_blend_task

router = APIRouter()
settings = get_settings()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_blend_ownership(blend_id: str, current_user: User, db: Session) -> None:
    """Raise 403 if current_user is not a participant in the blend."""
    blend = db.get(Blend, blend_id)
    if not blend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blend not found.")
    if current_user.id not in (blend.participant_a_id, blend.participant_b_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


def _service(db: Session) -> BlendService:
    return BlendService(db)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/")
def read_root() -> dict[str, str]:
    return {"status": "ok", "message": "Backend is running"}

@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# YouTube Music OAuth
# ---------------------------------------------------------------------------

@router.get("/auth/youtube/url")
def get_youtube_auth_url() -> dict[str, str]:
    """Return the Google OAuth URL for YouTube Music access."""
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Google OAuth is not configured.")

    state = secrets.token_urlsafe(16)
    scope = "https://www.googleapis.com/auth/youtube openid email profile"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.google_client_id}"
        f"&redirect_uri={settings.youtube_oauth_redirect_uri}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={state}"
    )
    return {"url": auth_url}


@router.get("/auth/youtube/callback")
def youtube_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Exchange OAuth code for token, decode id_token, login user cleanly via DB mapping."""
    import httpx
    import base64
    from datetime import timedelta
    from sqlalchemy import select
    from app.models import Session as AuthSession, generate_uuid

    frontend = settings.frontend_url.rstrip("/") if settings.frontend_url != "*" else "http://localhost:3000"

    if error:
        return RedirectResponse(url=f"{frontend}/login?error={error}")

    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Google OAuth is not configured.")

    token_response = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.youtube_oauth_redirect_uri,
            "grant_type": "authorization_code",
        },
    )
    if not token_response.is_success:
        return RedirectResponse(url=f"{frontend}/login?error=token_exchange_failed")

    token_data = token_response.json()
    id_token = token_data.get("id_token")
    if not id_token:
        return RedirectResponse(url=f"{frontend}/login?error=missing_id_token")

    # Decode standard Google JWT
    try:
        payload_part = id_token.split(".")[1]
        padded = payload_part + "=" * (-len(payload_part) % 4)
        id_payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
    except Exception:
        return RedirectResponse(url=f"{frontend}/login?error=invalid_id_token")

    email = id_payload.get("email")
    if not email:
        return RedirectResponse(url=f"{frontend}/login?error=email_not_provided")

    user = db.scalars(select(User).where(User.email == email)).first()
    now_ts = datetime.now(timezone.utc)

    if not user:
        user = User(
            id=generate_uuid(),
            email=email,
            name=id_payload.get("name") or email.split("@")[0],
            emailVerified=True,
            image=id_payload.get("picture"),
            createdAt=now_ts,
            updatedAt=now_ts,
        )
        db.add(user)
        db.flush()

    user.encrypted_auth = encrypt_auth_payload(token_data)
    user.auth_uploaded_at = now_ts
    user.auth_method = "oauth"

    session_token = secrets.token_urlsafe(32)
    auth_session = AuthSession(
        id=generate_uuid(),
        expiresAt=now_ts + timedelta(days=30),
        token=session_token,
        createdAt=now_ts,
        updatedAt=now_ts,
        userId=user.id
    )
    db.add(auth_session)
    db.commit()

    response = RedirectResponse(url=f"{frontend}/dashboard")
    response.set_cookie(
        key="better-auth.session_token",
        value=session_token,
        max_age=30 * 24 * 60 * 60,
        path="/",
        secure=not frontend.startswith("http://localhost"),
        httponly=True,
        samesite="lax",
    )
    return response


@router.get("/user/youtube-status")
def get_youtube_status(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return whether the user has connected YouTube Music and via which method."""
    return {
        "connected": current_user.encrypted_auth is not None,
        "method": current_user.auth_method,  # "oauth" | "headers" | None
    }


@router.get("/user/playlists")
def get_user_playlists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """Return the authenticated user's YouTube Music library playlists."""
    if not current_user.encrypted_auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect YouTube Music first — use OAuth or upload headers_auth.json.",
        )
    auth = decrypt_auth_payload(current_user.encrypted_auth)
    client = YTMusicService(auth_headers=auth)
    try:
        return client.get_library_playlists(limit=50)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not fetch playlists: {exc}") from exc


@router.get("/user/liked-songs/count")
def get_liked_songs_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Return the count of liked songs for the authenticated user."""
    if not current_user.encrypted_auth:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Connect YouTube Music first.")
    auth = decrypt_auth_payload(current_user.encrypted_auth)
    client = YTMusicService(auth_headers=auth)
    try:
        count = client.get_liked_songs_count()
        return {"count": count}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not fetch liked songs count: {exc}") from exc


# ---------------------------------------------------------------------------
# Blend
# ---------------------------------------------------------------------------

@router.post("/blend/create", response_model=BlendCreateResponse, status_code=status.HTTP_201_CREATED)
def create_blend(
    payload: BlendCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BlendCreateResponse:
    # Rate limit: max 10 blends per user per hour
    from sqlalchemy import select as sa_select, func
    from datetime import timedelta
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_count = db.scalar(
        sa_select(func.count()).select_from(Blend).where(
            (Blend.participant_a_id == current_user.id) | (Blend.participant_b_id == current_user.id),
            Blend.created_at >= one_hour_ago,
        )
    ) or 0
    if recent_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You have created too many blends recently. Please wait before creating another.",
            headers={"Retry-After": "3600"},
        )
    try:
        return _service(db).create_blend(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/user/upload-auth", status_code=status.HTTP_201_CREATED)
async def upload_auth_file(
    user_id: str = Form(...),
    headers_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if not headers_file.filename or not headers_file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a JSON auth file.")

    raw_bytes = await headers_file.read()
    try:
        validate_auth_file_size(len(raw_bytes))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    try:
        payload = json.loads(raw_bytes.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is not valid JSON.") from exc

    try:
        result = _service(db).save_auth_file(user_id=user_id, payload=payload)
        # Mark auth method as "headers" for legacy upload
        user = db.get(User, user_id)
        if user:
            user.auth_method = "headers"
            db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/blends/mine")
def get_my_blends(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return _service(db).get_user_blends(current_user.id)


@router.post("/playlist/fetch", response_model=PlaylistFetchResponse)
def fetch_playlists(
    payload: PlaylistFetchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlaylistFetchResponse:
    _check_blend_ownership(payload.blend_id, current_user, db)
    if not payload.sync:
        task = fetch_playlist_sources_task.delay(payload.blend_id)
        return PlaylistFetchResponse(blendId=payload.blend_id, status="queued", sources=[], taskId=task.id)

    try:
        return _service(db).fetch_sources(payload.blend_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/blend/{blend_id}", response_model=BlendDetailResponse)
def get_blend(
    blend_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BlendDetailResponse:
    _check_blend_ownership(blend_id, current_user, db)
    try:
        return _service(db).get_blend_detail(blend_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/blend/generate", response_model=BlendDetailResponse)
def generate_blend(
    payload: BlendGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BlendDetailResponse:
    _check_blend_ownership(payload.blend_id, current_user, db)

    # Idempotency: if blend is already ready, return existing result
    blend = db.get(Blend, payload.blend_id)
    if blend and blend.status == "ready":
        try:
            return _service(db).get_blend_detail(payload.blend_id)
        except ValueError:
            pass

    try:
        return _service(db).generate_blend(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/blend/generate/async", status_code=status.HTTP_202_ACCEPTED)
def generate_blend_async(
    payload: BlendGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    _check_blend_ownership(payload.blend_id, current_user, db)

    # Duplicate job prevention: check for active running job
    from sqlalchemy import select as sa_select
    active_job = db.scalars(
        sa_select(Job).where(
            Job.blend_id == payload.blend_id,
            Job.job_type == "generate",
            Job.status == "running",
        )
    ).first()
    if active_job:
        return {"blendId": payload.blend_id, "jobId": active_job.id, "status": "already_running"}

    task = generate_blend_task.delay(payload.blend_id, owner_id=current_user.id)
    return {"blendId": payload.blend_id, "taskId": task.id, "status": "queued"}


@router.post("/ytmusic/create-playlist", response_model=YTMusicPlaylistCreateResponse)
def create_ytmusic_playlist(
    payload: YTMusicPlaylistCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> YTMusicPlaylistCreateResponse:
    _check_blend_ownership(payload.blend_id, current_user, db)
    try:
        return _service(db).create_ytmusic_playlist(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/job/{job_id}")
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    if job.owner_id and job.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return {
        "jobId": job.id,
        "jobType": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "blendId": job.blend_id,
        "errorMessage": job.error_message,
    }


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

@router.post("/feedback/track", status_code=status.HTTP_200_OK)
def submit_track_feedback(
    payload: TrackFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = FeedbackService(db)
    record = service.record_track_feedback(
        user_id=current_user.id,
        blend_id=payload.blend_id,
        track_id=payload.track_id,
        action=payload.action,
    )
    return {"status": "toggled_off" if record is None else "recorded", "action": payload.action}


@router.post("/feedback/blend", status_code=status.HTTP_200_OK)
def submit_blend_feedback(
    payload: BlendFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = FeedbackService(db)
    service.record_blend_feedback(
        user_id=current_user.id,
        blend_id=payload.blend_id,
        rating=payload.rating,
        quick_option=payload.quick_option,
    )
    return {"status": "recorded"}

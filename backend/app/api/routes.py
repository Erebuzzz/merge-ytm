from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.auth_middleware import get_current_user
from app.core.security import validate_auth_file_size
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
from app.tasks import fetch_playlist_sources_task, generate_blend_task

router = APIRouter()


def _check_blend_ownership(blend_id: str, current_user: User, db: Session) -> None:
    """Raise 403 if current_user is not a participant in the blend."""
    blend = db.get(Blend, blend_id)
    if not blend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blend not found.")
    if current_user.id not in (blend.participant_a_id, blend.participant_b_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


def _service(db: Session) -> BlendService:
    return BlendService(db)


@router.get("/")
def read_root() -> dict[str, str]:
    return {"status": "ok", "message": "Backend is running"}

@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/blend/create", response_model=BlendCreateResponse, status_code=status.HTTP_201_CREATED)
def create_blend(
    payload: BlendCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BlendCreateResponse:
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
        return _service(db).save_auth_file(user_id=user_id, payload=payload)
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
    try:
        return _service(db).generate_blend(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/blend/generate/async", status_code=status.HTTP_202_ACCEPTED)
def generate_blend_async(
    payload: BlendGenerateRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    task = generate_blend_task.delay(payload.blend_id)
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

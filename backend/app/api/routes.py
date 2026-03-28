from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.api import (
    BlendCreateRequest,
    BlendCreateResponse,
    BlendDetailResponse,
    BlendGenerateRequest,
    PlaylistFetchRequest,
    PlaylistFetchResponse,
    YTMusicPlaylistCreateRequest,
    YTMusicPlaylistCreateResponse,
)
from app.services.blend_service import BlendService
from app.tasks import fetch_playlist_sources_task, generate_blend_task

router = APIRouter()


def _service(db: Session) -> BlendService:
    return BlendService(db)


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/blend/create", response_model=BlendCreateResponse, status_code=status.HTTP_201_CREATED)
def create_blend(payload: BlendCreateRequest, db: Session = Depends(get_db)) -> BlendCreateResponse:
    try:
        return _service(db).create_blend(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/user/upload-auth", status_code=status.HTTP_201_CREATED)
async def upload_auth_file(
    user_id: str = Form(...),
    headers_file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if not headers_file.filename or not headers_file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a JSON auth file.")

    raw_bytes = await headers_file.read()
    try:
        payload = json.loads(raw_bytes.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is not valid JSON.") from exc

    try:
        return _service(db).save_auth_file(user_id=user_id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/blends/mine")
def get_my_blends(user_id: str, db: Session = Depends(get_db)) -> list[dict]:
    return _service(db).get_user_blends(user_id)


@router.post("/playlist/fetch", response_model=PlaylistFetchResponse)
def fetch_playlists(payload: PlaylistFetchRequest, db: Session = Depends(get_db)) -> PlaylistFetchResponse:
    if not payload.sync:
        task = fetch_playlist_sources_task.delay(payload.blend_id)
        return PlaylistFetchResponse(blendId=payload.blend_id, status="queued", sources=[], taskId=task.id)

    try:
        return _service(db).fetch_sources(payload.blend_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/blend/{blend_id}", response_model=BlendDetailResponse)
def get_blend(blend_id: str, db: Session = Depends(get_db)) -> BlendDetailResponse:
    try:
        return _service(db).get_blend_detail(blend_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/blend/generate", response_model=BlendDetailResponse)
def generate_blend(payload: BlendGenerateRequest, db: Session = Depends(get_db)) -> BlendDetailResponse:
    try:
        return _service(db).generate_blend(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/blend/generate/async", status_code=status.HTTP_202_ACCEPTED)
def generate_blend_async(payload: BlendGenerateRequest) -> dict[str, str]:
    task = generate_blend_task.delay(payload.blend_id)
    return {"blendId": payload.blend_id, "taskId": task.id, "status": "queued"}


@router.post("/ytmusic/create-playlist", response_model=YTMusicPlaylistCreateResponse)
def create_ytmusic_playlist(
    payload: YTMusicPlaylistCreateRequest,
    db: Session = Depends(get_db),
) -> YTMusicPlaylistCreateResponse:
    try:
        return _service(db).create_ytmusic_playlist(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decrypt_auth_payload, encrypt_auth_payload
from app.models import Blend, PlaylistSource, User
from app.schemas.api import (
    BlendCreateRequest,
    BlendCreateResponse,
    BlendDetailResponse,
    BlendGenerateRequest,
    BlendParticipantSummary,
    BlendSection,
    ParticipantSourceInput,
    PlaylistFetchResponse,
    SourceFetchSummary,
    TrackPayload,
    YTMusicPlaylistCreateRequest,
    YTMusicPlaylistCreateResponse,
)
from app.services.blend_engine import generate_blend
from app.services.normalization import deduplicate_tracks
from app.services.ytmusic_client import YTMusicService


class BlendService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_blend(self, payload: BlendCreateRequest) -> BlendCreateResponse:
        if not self._participant_has_source(payload.user_a) or not self._participant_has_source(payload.user_b):
            raise ValueError("Each listener needs at least one playlist link or a liked songs import.")

        user_a = None
        if payload.creator_id:
            user_a = self.db.get(User, payload.creator_id)
        
        if not user_a:
            user_a = User(id=str(uuid.uuid4()), name=payload.user_a.name.strip(), email=f"{uuid.uuid4()}@anon.local", emailVerified=False, createdAt=datetime.now(), updatedAt=datetime.now())
            self.db.add(user_a)

        user_b_id = str(uuid.uuid4())
        user_b = User(id=user_b_id, name=payload.user_b.name.strip(), email=f"{user_b_id}@anon.local", emailVerified=False, createdAt=datetime.now(), updatedAt=datetime.now())
        self.db.add(user_b)
        self.db.flush()

        sources: list[PlaylistSource] = []
        for link in payload.user_a.playlist_links:
            sources.append(PlaylistSource(user_id=user_a.id, source_type="playlist", source_value=link))
        for link in payload.user_b.playlist_links:
            sources.append(PlaylistSource(user_id=user_b.id, source_type="playlist", source_value=link))
        if payload.user_a.include_liked_songs:
            sources.append(PlaylistSource(user_id=user_a.id, source_type="liked_songs", source_value="liked_songs"))
        if payload.user_b.include_liked_songs:
            sources.append(PlaylistSource(user_id=user_b.id, source_type="liked_songs", source_value="liked_songs"))

        blend = Blend(participant_a_id=user_a.id, participant_b_id=user_b.id, status="pending")
        self.db.add(blend)
        self.db.add_all(sources)
        self.db.commit()

        return BlendCreateResponse(
            blendId=blend.id,
            userIds={"userA": user_a.id, "userB": user_b.id},
            status=blend.status,
        )

    def get_user_blends(self, user_id: str) -> list[dict]:
        blends = self.db.scalars(
            select(Blend).where(
                (Blend.participant_a_id == user_id) | (Blend.participant_b_id == user_id)
            ).order_by(Blend.created_at.desc())
        ).all()
        
        result = []
        for b in blends:
            result.append({
                "id": b.id,
                "participant_a_name": b.participant_a.name if b.participant_a else "Unknown",
                "participant_b_name": b.participant_b.name if b.participant_b else "Unknown",
                "compatibility_score": b.compatibility_score,
                "created_at": b.created_at.isoformat() if b.created_at else None
            })
        return result

    def save_auth_file(self, user_id: str, payload: dict[str, Any]) -> dict[str, str]:
        user = self._get_user(user_id)
        user.encrypted_auth = encrypt_auth_payload(payload)
        user.auth_uploaded_at = datetime.now(timezone.utc)
        self.db.commit()
        return {"userId": user.id, "status": "stored"}

    def fetch_sources(self, blend_id: str) -> PlaylistFetchResponse:
        blend = self._get_blend(blend_id)
        participants = self._participants_for_blend(blend)
        sources = self._sources_for_users([blend.participant_a_id, blend.participant_b_id])

        summaries: list[SourceFetchSummary] = []
        for source in sources:
            user = participants[source.user_id]
            auth_headers = decrypt_auth_payload(user.encrypted_auth) if user.encrypted_auth else None
            client = YTMusicService(auth_headers=auth_headers)

            try:
                source.status = "processing"
                if source.source_type == "playlist":
                    tracks = client.get_playlist_tracks(source.source_value)
                else:
                    if not auth_headers:
                        raise ValueError("Upload headers_auth.json to import liked songs for this user.")
                    tracks = client.get_liked_tracks()

                deduplicated = deduplicate_tracks(tracks)
                source.tracks = [track.model_dump(by_alias=True) for track in deduplicated]
                source.track_count = len(deduplicated)
                source.failure_reason = None
                source.status = "ready"
            except Exception as exc:
                source.status = "failed"
                source.failure_reason = str(exc)
                source.track_count = 0
                source.tracks = []

            summaries.append(
                SourceFetchSummary(
                    userId=source.user_id,
                    sourceType=source.source_type,
                    sourceValue=source.source_value,
                    trackCount=source.track_count,
                    status=source.status,
                    failureReason=source.failure_reason,
                )
            )

        blend.status = "sources_ready" if sources and all(source.status == "ready" for source in sources) else "sources_partial"
        self.db.commit()

        return PlaylistFetchResponse(blendId=blend.id, status=blend.status, sources=summaries)

    def generate_blend(self, payload: BlendGenerateRequest) -> BlendDetailResponse:
        blend = self._get_blend(payload.blend_id)
        sources = self._sources_for_users([blend.participant_a_id, blend.participant_b_id])

        user_a_tracks: list[TrackPayload] = []
        user_b_tracks: list[TrackPayload] = []
        for source in sources:
            tracks = [TrackPayload.model_validate(item) for item in source.tracks or []]
            if source.user_id == blend.participant_a_id:
                user_a_tracks.extend(tracks)
            else:
                user_b_tracks.extend(tracks)

        if not user_a_tracks and not user_b_tracks:
            raise ValueError("No tracks were available to generate the blend.")

        # Compute feedback boosts from BOTH users' feedback history
        from app.models import TrackFeedback
        from sqlalchemy import select as sa_select
        from app.core.config import get_settings as _get_settings
        _s = _get_settings()

        feedback_rows = self.db.scalars(
            sa_select(TrackFeedback).where(
                TrackFeedback.user_id.in_([blend.participant_a_id, blend.participant_b_id]),
                TrackFeedback.blend_id == blend.id,
            )
        ).all()
        feedback_boosts: dict[str, float] = {}
        for row in feedback_rows:
            if row.action == "like":
                feedback_boosts[row.track_id] = feedback_boosts.get(row.track_id, 0) + _s.feedback_like_boost
            elif row.action == "dislike":
                feedback_boosts[row.track_id] = feedback_boosts.get(row.track_id, 0) - _s.feedback_dislike_penalty
            elif row.action == "skip":
                feedback_boosts[row.track_id] = feedback_boosts.get(row.track_id, 0) - _s.feedback_skip_penalty

        result = generate_blend(user_a_tracks, user_b_tracks, feedback_boosts=feedback_boosts)
        sections = result["sections"]
        blend.tracks_common = [track.model_dump(by_alias=True) for track in sections[0].tracks]
        blend.tracks_a = [track.model_dump(by_alias=True) for track in sections[1].tracks]
        blend.tracks_b = [track.model_dump(by_alias=True) for track in sections[2].tracks]

        # Algorithm Discoveries
        seed_ids = []
        for track in sections[0].tracks:
            if track.video_id:
                seed_ids.append(track.video_id)
                break
        
        if not seed_ids:
            for track in sections[1].tracks + sections[2].tracks:
                if track.video_id:
                    seed_ids.append(track.video_id)
                    break

        recommended = []
        if seed_ids:
            try:
                client = YTMusicService()
                raw_recs = client.get_recommendations(seed_ids, limit=20)
                existing_keys = {t.normalized_key for t in user_a_tracks + user_b_tracks if t.normalized_key}
                discoveries = [r for r in raw_recs if r.normalized_key not in existing_keys]
                recommended = discoveries[:15]
            except Exception:
                pass

        blend.tracks_recommended = [track.model_dump(by_alias=True) for track in recommended]
        
        blend.compatibility_score = float(result["compatibility_score"])
        blend.diagnostics = result["diagnostics"]
        blend.status = "ready"
        self.db.commit()

        return self.get_blend_detail(blend.id)

    def create_ytmusic_playlist(self, payload: YTMusicPlaylistCreateRequest) -> YTMusicPlaylistCreateResponse:
        blend = self._get_blend(payload.blend_id)
        user = self._get_user(payload.user_id)
        if not user.encrypted_auth:
            raise ValueError("Upload headers_auth.json before exporting a playlist.")

        tracks = self._flatten_blend_tracks(blend)
        service = YTMusicService(auth_headers=decrypt_auth_payload(user.encrypted_auth))
        description = payload.description or "A private blend created by Merge."
        playlist_id = service.create_private_playlist(payload.title, description, tracks)

        blend.youtube_playlist_id = playlist_id
        blend.status = "synced"
        self.db.commit()

        return YTMusicPlaylistCreateResponse(blendId=blend.id, playlistId=playlist_id, status=blend.status)

    def get_blend_detail(self, blend_id: str) -> BlendDetailResponse:
        blend = self._get_blend(blend_id)
        participants = self._participants_for_blend(blend)
        name_a = participants[blend.participant_a_id].name
        name_b = participants[blend.participant_b_id].name
        sections = [
            BlendSection(
                title="Shared Taste",
                description="Tracks both listeners already have in common.",
                tracks=[TrackPayload.model_validate(item) for item in blend.tracks_common or []],
            ),
            BlendSection(
                title=f"From {name_a}",
                description=f"Recommendations from {name_a} that still fit the shared pocket.",
                tracks=[TrackPayload.model_validate(item) for item in blend.tracks_a or []],
            ),
            BlendSection(
                title=f"From {name_b}",
                description=f"Recommendations from {name_b} that still fit the shared pocket.",
                tracks=[TrackPayload.model_validate(item) for item in blend.tracks_b or []],
            ),
            BlendSection(
                title="New Discoveries",
                description="Algorithmic recommendations based on your combined music tastes.",
                tracks=[TrackPayload.model_validate(item) for item in blend.tracks_recommended or []],
            ),
        ]

        sources = self._sources_for_users([blend.participant_a_id, blend.participant_b_id])
        source_counts = {
            blend.participant_a_id: len([source for source in sources if source.user_id == blend.participant_a_id]),
            blend.participant_b_id: len([source for source in sources if source.user_id == blend.participant_b_id]),
        }

        return BlendDetailResponse(
            id=blend.id,
            status=blend.status,
            compatibilityScore=blend.compatibility_score,
            sections=sections,
            participants={
                "userA": BlendParticipantSummary(
                    userId=participants[blend.participant_a_id].id,
                    name=participants[blend.participant_a_id].name,
                    sourceCount=source_counts[blend.participant_a_id],
                    hasAuth=bool(participants[blend.participant_a_id].encrypted_auth),
                ),
                "userB": BlendParticipantSummary(
                    userId=participants[blend.participant_b_id].id,
                    name=participants[blend.participant_b_id].name,
                    sourceCount=source_counts[blend.participant_b_id],
                    hasAuth=bool(participants[blend.participant_b_id].encrypted_auth),
                ),
            },
            youtubePlaylistId=blend.youtube_playlist_id,
            diagnostics=blend.diagnostics or {},
        )

    def _get_blend(self, blend_id: str) -> Blend:
        blend = self.db.get(Blend, blend_id)
        if not blend:
            raise ValueError("Blend not found.")
        return blend

    def _get_user(self, user_id: str) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError("User not found.")
        return user

    def _sources_for_users(self, user_ids: list[str]) -> list[PlaylistSource]:
        return list(
            self.db.scalars(
                select(PlaylistSource).where(PlaylistSource.user_id.in_(user_ids)).order_by(PlaylistSource.created_at.asc())
            )
        )

    def _participants_for_blend(self, blend: Blend) -> dict[str, User]:
        return {
            blend.participant_a_id: self._get_user(blend.participant_a_id),
            blend.participant_b_id: self._get_user(blend.participant_b_id),
        }

    def _flatten_blend_tracks(self, blend: Blend) -> list[TrackPayload]:
        combined = []
        for payload in [blend.tracks_common, blend.tracks_a, blend.tracks_b, blend.tracks_recommended]:
            combined.extend(TrackPayload.model_validate(item) for item in payload or [])
        return combined

    def submit_feedback(self, user_id: str, blend_id: str, track_id: str, action: str) -> dict:
        from app.services.feedback_service import FeedbackService
        service = FeedbackService(self.db)
        record = service.record_track_feedback(user_id, blend_id, track_id, action)
        return {"status": "toggled_off" if record is None else "recorded"}

    def submit_blend_feedback(self, user_id: str, blend_id: str, rating: int | None, quick_option: str | None) -> dict:
        from app.services.feedback_service import FeedbackService
        service = FeedbackService(self.db)
        service.record_blend_feedback(user_id, blend_id, rating, quick_option)
        return {"status": "recorded"}

    @staticmethod
    def _participant_has_source(participant: ParticipantSourceInput) -> bool:
        has_links = any(link.strip() for link in participant.playlist_links)
        return has_links or participant.include_liked_songs

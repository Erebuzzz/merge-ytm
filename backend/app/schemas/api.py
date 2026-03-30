from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

YTM_PLAYLIST_PATTERN = re.compile(
    r"^(https://music\.youtube\.com/(playlist\?list=|watch\?.*list=)[A-Za-z0-9_\-]+|[A-Za-z0-9_\-]{10,})"
)


class TrackPayload(BaseModel):
    title: str
    artist: str
    video_id: str | None = Field(default=None, alias="videoId")
    normalized_key: str | None = Field(default=None, alias="normalizedKey")
    source: str | None = None
    score: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class BlendSection(BaseModel):
    title: str
    description: str
    tracks: list[TrackPayload]


class ParticipantSourceInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    playlist_links: list[str] = Field(default_factory=list)
    include_liked_songs: bool = False

    @field_validator("playlist_links", mode="before")
    @classmethod
    def validate_playlist_links(cls, links: list) -> list:
        if len(links) > 5:
            raise ValueError("A maximum of 5 playlist links is supported per user.")
        errors = []
        for i, link in enumerate(links):
            link_str = str(link).strip()
            if link_str and not YTM_PLAYLIST_PATTERN.match(link_str):
                errors.append(f"Link {i + 1} is not a valid YouTube Music playlist URL: {link_str!r}")
        if errors:
            raise ValueError("; ".join(errors))
        return links


class BlendCreateRequest(BaseModel):
    user_a: ParticipantSourceInput
    user_b: ParticipantSourceInput
    creator_id: str | None = None


class BlendCreateResponse(BaseModel):
    blend_id: str = Field(alias="blendId")
    user_ids: dict[str, str] = Field(alias="userIds")
    status: str

    model_config = ConfigDict(populate_by_name=True)


class PlaylistFetchRequest(BaseModel):
    blend_id: str = Field(alias="blendId")
    sync: bool = True

    model_config = ConfigDict(populate_by_name=True)


class SourceFetchSummary(BaseModel):
    user_id: str = Field(alias="userId")
    source_type: str = Field(alias="sourceType")
    source_value: str = Field(alias="sourceValue")
    track_count: int = Field(alias="trackCount")
    status: str
    failure_reason: str | None = Field(default=None, alias="failureReason")

    model_config = ConfigDict(populate_by_name=True)


class PlaylistFetchResponse(BaseModel):
    blend_id: str = Field(alias="blendId")
    status: str
    sources: list[SourceFetchSummary]
    task_id: str | None = Field(default=None, alias="taskId")

    model_config = ConfigDict(populate_by_name=True)


class BlendGenerateRequest(BaseModel):
    blend_id: str = Field(alias="blendId")

    model_config = ConfigDict(populate_by_name=True)


class BlendParticipantSummary(BaseModel):
    user_id: str = Field(alias="userId")
    name: str
    source_count: int = Field(alias="sourceCount")
    has_auth: bool = Field(alias="hasAuth")

    model_config = ConfigDict(populate_by_name=True)


class BlendDetailResponse(BaseModel):
    id: str
    status: str
    compatibility_score: float = Field(alias="compatibilityScore")
    sections: list[BlendSection]
    participants: dict[str, BlendParticipantSummary]
    youtube_playlist_id: str | None = Field(default=None, alias="youtubePlaylistId")
    diagnostics: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class YTMusicPlaylistCreateRequest(BaseModel):
    blend_id: str = Field(alias="blendId")
    user_id: str = Field(alias="userId")
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(populate_by_name=True)


class YTMusicPlaylistCreateResponse(BaseModel):
    blend_id: str = Field(alias="blendId")
    playlist_id: str = Field(alias="playlistId")
    status: str

    model_config = ConfigDict(populate_by_name=True)


class TrackFeedbackRequest(BaseModel):
    blend_id: str = Field(alias="blendId")
    track_id: str = Field(alias="trackId")
    action: str  # "like" | "dislike" | "skip"

    model_config = ConfigDict(populate_by_name=True)


class BlendFeedbackRequest(BaseModel):
    blend_id: str = Field(alias="blendId")
    rating: int | None = Field(default=None, ge=1, le=5)
    quick_option: str | None = Field(default=None, alias="quickOption")

    model_config = ConfigDict(populate_by_name=True)

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


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

    @model_validator(mode="after")
    def validate_links(self) -> "ParticipantSourceInput":
        if len(self.playlist_links) > 5:
            raise ValueError("A maximum of 5 playlist links is supported per user.")
        return self


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

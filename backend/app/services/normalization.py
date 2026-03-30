from __future__ import annotations

import re
import unicodedata
from typing import Any

from rapidfuzz import fuzz

from app.schemas.api import TrackPayload

TITLE_NOISE_PATTERN = re.compile(
    r"(\(|\[).{0,32}(official video|official music video|lyrics?|audio|video|remaster(?:ed)?|visualizer|live).{0,32}(\)|\])",
    re.IGNORECASE,
)
WHITESPACE_PATTERN = re.compile(r"\s+")
ARTIST_SEPARATOR_PATTERN = re.compile(r"\s*(?:,|&| x | and | feat\.?|ft\.?|with)\s*", re.IGNORECASE)
NON_WORD_PATTERN = re.compile(r"[^\w\s]")


def _compact_whitespace(value: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", value).strip()


def _nfkd_lower(value: str) -> str:
    """Apply NFKD normalization, strip combining marks, then lowercase."""
    nfkd = unicodedata.normalize("NFKD", value)
    stripped = "".join(ch for ch in nfkd if unicodedata.category(ch) != "Mn")
    return stripped.lower()


def normalize_title(title: str) -> str:
    cleaned = TITLE_NOISE_PATTERN.sub(" ", _nfkd_lower(title))
    cleaned = NON_WORD_PATTERN.sub(" ", cleaned)
    return _compact_whitespace(cleaned)


def normalize_artist(artist: str) -> str:
    cleaned = NON_WORD_PATTERN.sub(" ", _nfkd_lower(artist))
    cleaned = _compact_whitespace(cleaned)
    primary_artist = ARTIST_SEPARATOR_PATTERN.split(cleaned)[0]
    return _compact_whitespace(primary_artist)


def build_normalized_key(title: str, artist: str) -> str:
    return f"{normalize_title(title)}::{normalize_artist(artist)}"


def normalize_track(track: TrackPayload) -> TrackPayload:
    return track.model_copy(
        update={
            "normalized_key": build_normalized_key(track.title, track.artist),
        }
    )


def is_near_duplicate(candidate: TrackPayload, existing: TrackPayload, threshold: int = 85) -> bool:
    title_score = fuzz.token_sort_ratio(normalize_title(candidate.title), normalize_title(existing.title))
    artist_score = fuzz.token_sort_ratio(normalize_artist(candidate.artist), normalize_artist(existing.artist))
    return title_score >= threshold and artist_score >= threshold - 10


def deduplicate_tracks(tracks: list[TrackPayload], threshold: int = 85) -> list[TrackPayload]:
    deduplicated: list[TrackPayload] = []

    for raw_track in tracks:
        track = normalize_track(raw_track)
        if any(
            existing.normalized_key == track.normalized_key or is_near_duplicate(track, existing, threshold)
            for existing in deduplicated
        ):
            continue
        deduplicated.append(track)

    return deduplicated


def track_from_ytmusic(item: dict[str, Any], source: str | None = None) -> TrackPayload | None:
    title = item.get("title")
    if not title:
        return None

    video_id = item.get("videoId")
    if not video_id:  # Req 6.3: skip tracks missing videoId
        return None

    artists = item.get("artists") or []
    artist_name = ", ".join(entry.get("name", "") for entry in artists if entry.get("name")) or item.get("artist") or ""
    if not artist_name:  # Req 6.3: skip tracks missing artist
        return None

    metadata = {
        "album": (item.get("album") or {}).get("name") if isinstance(item.get("album"), dict) else item.get("album"),
        "duration": item.get("duration"),
        "isAvailable": item.get("isAvailable"),
    }

    return normalize_track(
        TrackPayload(
            title=title,
            artist=artist_name,
            videoId=item.get("videoId"),
            source=source,
            metadata={key: value for key, value in metadata.items() if value is not None},
        )
    )

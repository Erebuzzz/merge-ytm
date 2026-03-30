from __future__ import annotations

import json
import logging
import os
import tempfile
from collections.abc import Iterable
from typing import Any
from urllib.parse import parse_qs, urlparse

from tenacity import retry, stop_after_attempt, wait_exponential
from ytmusicapi import YTMusic

from app.core.config import get_settings
from app.schemas.api import TrackPayload
from app.services.normalization import build_normalized_key, track_from_ytmusic

logger = logging.getLogger(__name__)

settings = get_settings()


def extract_playlist_id(url_or_id: str) -> str:
    if "://" not in url_or_id:
        return url_or_id

    parsed = urlparse(url_or_id)
    query = parse_qs(parsed.query)
    playlist_ids = query.get("list", [])
    if not playlist_ids:
        raise ValueError("Could not find a YouTube Music playlist id in the provided link.")
    return playlist_ids[0]


class YTMusicService:
    def __init__(self, auth_headers: dict[str, Any] | None = None) -> None:
        self.auth_headers = auth_headers

    def _build_client(self) -> tuple[YTMusic, str | None]:
        temp_path: str | None = None
        if self.auth_headers:
            handle, temp_path = tempfile.mkstemp(suffix=".json")
            with os.fdopen(handle, "w", encoding="utf-8") as temp_file:
                json.dump(self.auth_headers, temp_file)
            return YTMusic(temp_path), temp_path
        return YTMusic(), None

    def _run_with_client(self, callback):
        client, temp_path = self._build_client()
        try:
            return callback(client)
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

    @retry(stop=stop_after_attempt(settings.ytmusic_retry_attempts), wait=wait_exponential(min=1, max=8), reraise=True)
    def get_playlist_tracks(self, playlist_url: str) -> list[TrackPayload]:
        playlist_id = extract_playlist_id(playlist_url)
        payload = self._run_with_client(lambda client: client.get_playlist(playlist_id, limit=None))
        tracks: list[TrackPayload] = []
        for item in payload.get("tracks", []):
            track = track_from_ytmusic(item, source=playlist_url)
            if track:
                tracks.append(track)
        total = len(payload.get("tracks", []))
        valid = len(tracks)
        skipped = total - valid
        if total > 0:
            logger.info(
                "Playlist fetch complete: source=%s total=%d valid=%d skipped=%d success_rate=%.1f%% missing_ratio=%.1f%%",
                playlist_url, total, valid, skipped,
                valid / total * 100,
                skipped / total * 100,
            )
        return tracks

    @retry(stop=stop_after_attempt(settings.ytmusic_retry_attempts), wait=wait_exponential(min=1, max=8), reraise=True)
    def get_liked_tracks(self, limit: int | None = None) -> list[TrackPayload]:
        payload = self._run_with_client(lambda client: client.get_liked_songs(limit=limit or settings.liked_songs_limit))
        tracks: list[TrackPayload] = []
        for item in payload.get("tracks", []):
            track = track_from_ytmusic(item, source="liked_songs")
            if track:
                tracks.append(track)
        total = len(payload.get("tracks", []))
        valid = len(tracks)
        skipped = total - valid
        if total > 0:
            logger.info(
                "Liked songs fetch complete: total=%d valid=%d skipped=%d success_rate=%.1f%% missing_ratio=%.1f%%",
                total, valid, skipped,
                valid / total * 100,
                skipped / total * 100,
            )
        return tracks

    def _validate_track(self, client: YTMusic, track: TrackPayload) -> str | None:
        if not track.video_id:
            return None

        query = f"{track.title} {track.artist}"
        matches = client.search(query, filter="songs", limit=5)
        expected_key = build_normalized_key(track.title, track.artist)
        for match in matches:
            candidate = track_from_ytmusic(match)
            if candidate and candidate.normalized_key == expected_key and candidate.video_id:
                return candidate.video_id
        return track.video_id

    @retry(stop=stop_after_attempt(settings.ytmusic_retry_attempts), wait=wait_exponential(min=1, max=8), reraise=True)
    def create_private_playlist(
        self,
        title: str,
        description: str,
        tracks: Iterable[TrackPayload],
    ) -> str:
        def callback(client: YTMusic) -> str:
            playlist_id = client.create_playlist(title, description, privacy_status="PRIVATE")
            validated_ids: list[str] = []
            for track in tracks:
                validated_id = self._validate_track(client, track)
                if validated_id:
                    validated_ids.append(validated_id)
            if not validated_ids:
                raise ValueError("No playable tracks were available to push to YouTube Music.")
            client.add_playlist_items(playlist_id, validated_ids)
            return playlist_id

        return self._run_with_client(callback)

    @retry(stop=stop_after_attempt(settings.ytmusic_retry_attempts), wait=wait_exponential(min=1, max=8), reraise=True)
    def get_recommendations(self, video_ids: list[str], limit: int = 15) -> list[TrackPayload]:
        """Fetch YouTube Music up-next (radio) recommendations based on seed video IDs."""
        if not video_ids:
            return []

        # We seed the radio station with the first video ID
        # ytmusicapi get_watch_playlist provides up next / radio
        def callback(client: YTMusic) -> list[TrackPayload]:
            payload = client.get_watch_playlist(videoId=video_ids[0])
            tracks: list[TrackPayload] = []
            
            # Skip the first track as it's the seed track
            for item in payload.get("tracks", [])[1:]:
                # If we have multiple seeds, we probably shouldn't include them in the recommendations
                if item.get("videoId") in video_ids:
                    continue
                
                track = track_from_ytmusic(item, source="algorithmic_recommendation")
                if track and len(tracks) < limit:
                    tracks.append(track)
            return tracks

        return self._run_with_client(callback)

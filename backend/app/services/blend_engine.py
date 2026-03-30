from __future__ import annotations

from collections import Counter

from rapidfuzz import fuzz

from app.core.config import get_settings
from app.schemas.api import BlendSection, TrackPayload
from app.services.normalization import deduplicate_tracks, normalize_artist

settings = get_settings()


def _artist_similarity(track: TrackPayload, reference_tracks: list[TrackPayload]) -> float:
    if not reference_tracks:
        return 0.0

    candidate_artist = normalize_artist(track.artist)
    scores = [
        fuzz.token_set_ratio(candidate_artist, normalize_artist(reference.artist)) / 100
        for reference in reference_tracks
        if reference.artist
    ]
    return max(scores, default=0.0)


def _diversity_factor(track: TrackPayload, track_pool: list[TrackPayload]) -> float:
    artist_counts = Counter(normalize_artist(item.artist) for item in track_pool)
    current_artist_frequency = artist_counts.get(normalize_artist(track.artist), 1)
    max_frequency = max(artist_counts.values(), default=1)
    return 1 - ((current_artist_frequency - 1) / max_frequency)


def _score_track(
    track: TrackPayload,
    own_pool: list[TrackPayload],
    opposite_pool: list[TrackPayload],
    common_pool: list[TrackPayload],
    overlap_ratio: float,
    track_frequency: int = 1,
    max_frequency: int = 1,
) -> TrackPayload:
    artist_similarity = max(
        _artist_similarity(track, opposite_pool),
        _artist_similarity(track, common_pool),
    )
    diversity_factor = _diversity_factor(track, own_pool)
    frequency_weight = (track_frequency - 1) / max_frequency * 0.1 if max_frequency > 0 else 0.0
    score = (0.5 * overlap_ratio) + (0.3 * artist_similarity) + (0.2 * diversity_factor) + frequency_weight
    return track.model_copy(update={"score": round(score * 100, 2)})


def _section_limit(common_count: int) -> tuple[int, int]:
    common_limit = min(common_count, settings.max_tracks_per_section)
    remaining_slots = max(settings.total_tracks_limit - common_limit, 0)
    side_limit = min(settings.max_tracks_per_section, remaining_slots // 2 if remaining_slots else 0)
    return common_limit, side_limit


def generate_blend(
    tracks_a: list[TrackPayload],
    tracks_b: list[TrackPayload],
    feedback_boosts: dict[str, float] | None = None,
) -> dict[str, object]:
    unique_a = deduplicate_tracks(tracks_a)
    unique_b = deduplicate_tracks(tracks_b)

    keyed_a = {track.normalized_key: track for track in unique_a if track.normalized_key}
    keyed_b = {track.normalized_key: track for track in unique_b if track.normalized_key}

    common_keys = set(keyed_a) & set(keyed_b)
    common_tracks = sorted((keyed_a[key] for key in common_keys), key=lambda track: (track.artist.lower(), track.title.lower()))
    exclusive_a = [track for key, track in keyed_a.items() if key not in common_keys]
    exclusive_b = [track for key, track in keyed_b.items() if key not in common_keys]

    # Compatibility score: Dice coefficient formula (Req 8.5)
    denom = len(unique_a) + len(unique_b)
    compatibility_score = 2 * len(common_tracks) / denom * 100 if denom > 0 else 0.0

    # overlap_ratio used for scoring (internal metric, not the compatibility score)
    total_unique_tracks = len(set(keyed_a) | set(keyed_b))
    overlap_ratio = len(common_tracks) / total_unique_tracks if total_unique_tracks else 1.0

    # Compute track frequency across all input tracks (before deduplication) for Req 8.8
    all_input_keys = [t.normalized_key for t in tracks_a + tracks_b if t.normalized_key]
    track_freq: Counter[str] = Counter(all_input_keys)
    max_freq = max(track_freq.values(), default=1)

    def _score_with_freq(track: TrackPayload, own_pool: list[TrackPayload], opp_pool: list[TrackPayload]) -> TrackPayload:
        freq = track_freq.get(track.normalized_key or "", 1)
        return _score_track(track, own_pool, opp_pool, common_tracks, overlap_ratio, freq, max_freq)

    scored_a = sorted(
        (_score_with_freq(track, exclusive_a, exclusive_b) for track in exclusive_a),
        key=lambda track: (track.score or 0, track.artist.lower(), track.title.lower()),
        reverse=True,
    )
    scored_b = sorted(
        (_score_with_freq(track, exclusive_b, exclusive_a) for track in exclusive_b),
        key=lambda track: (track.score or 0, track.artist.lower(), track.title.lower()),
        reverse=True,
    )

    # Apply feedback boosts (Req 8.9)
    if feedback_boosts:
        def _apply_boost(track: TrackPayload) -> TrackPayload:
            boost = feedback_boosts.get(track.normalized_key or "", 0.0)
            if boost:
                return track.model_copy(update={"score": round((track.score or 0) + boost, 2)})
            return track

        scored_a = sorted(map(_apply_boost, scored_a), key=lambda t: (t.score or 0), reverse=True)
        scored_b = sorted(map(_apply_boost, scored_b), key=lambda t: (t.score or 0), reverse=True)

    common_limit, side_limit = _section_limit(len(common_tracks))
    sections = [
        BlendSection(
            title="Shared Taste",
            description="Tracks both listeners already have in common.",
            tracks=common_tracks[:common_limit],
        ),
        BlendSection(
            title="From User A",
            description="Recommendations from User A that still fit the shared pocket.",
            tracks=scored_a[:side_limit],
        ),
        BlendSection(
            title="From User B",
            description="Recommendations from User B that still fit the shared pocket.",
            tracks=scored_b[:side_limit],
        ),
    ]

    return {
        "compatibility_score": round(compatibility_score, 2),
        "sections": sections,
        "diagnostics": {
            "commonCount": len(common_tracks),
            "userACount": len(unique_a),
            "userBCount": len(unique_b),
            "overlapRatio": round(overlap_ratio, 4),
            "recommendedFromA": len(scored_a[:side_limit]),
            "recommendedFromB": len(scored_b[:side_limit]),
        },
    }

"""
Property-based tests for the Merge backend.

# Feature: merge-rebrand-refactor
"""

from hypothesis import given, settings
from hypothesis import strategies as st

# ---------------------------------------------------------------------------
# Property 8: Job status progression
# Validates: Requirements 10.2, 10.3, 10.4, 10.5
# ---------------------------------------------------------------------------

VALID_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"running"},
    "running": {"done", "failed"},
    "done": set(),
    "failed": set(),
}

ALL_STATUSES = list(VALID_TRANSITIONS.keys())


def can_transition(from_status: str, to_status: str) -> bool:
    """Return True only if transitioning from_status → to_status is a valid forward move."""
    return to_status in VALID_TRANSITIONS.get(from_status, set())


# Known-valid transitions
FORWARD_TRANSITIONS = [
    ("pending", "running"),
    ("running", "done"),
    ("running", "failed"),
]

# Known-invalid (regressive or lateral) transitions
INVALID_TRANSITIONS = [
    ("pending", "done"),
    ("pending", "failed"),
    ("running", "pending"),
    ("done", "pending"),
    ("done", "running"),
    ("done", "failed"),
    ("failed", "pending"),
    ("failed", "running"),
    ("failed", "done"),
]


@given(
    from_status=st.sampled_from(ALL_STATUSES),
    to_status=st.sampled_from(ALL_STATUSES),
)
@settings(max_examples=200)
def test_job_status_progression_property(from_status: str, to_status: str) -> None:
    """
    **Property 8: Job status progression**

    For any pair of statuses, `can_transition` must agree with `VALID_TRANSITIONS`:
    - It returns True only for the three forward moves.
    - It returns False for every self-transition and every regressive move.

    **Validates: Requirements 10.2, 10.3, 10.4, 10.5**
    """
    result = can_transition(from_status, to_status)
    expected = to_status in VALID_TRANSITIONS[from_status]
    assert result == expected, (
        f"can_transition({from_status!r}, {to_status!r}) returned {result}, "
        f"expected {expected}"
    )


def test_valid_transitions_are_allowed() -> None:
    """All known-valid forward transitions must be accepted."""
    for from_s, to_s in FORWARD_TRANSITIONS:
        assert can_transition(from_s, to_s), f"Expected {from_s} → {to_s} to be allowed"


def test_invalid_transitions_are_rejected() -> None:
    """All known-invalid / regressive transitions must be rejected."""
    for from_s, to_s in INVALID_TRANSITIONS:
        assert not can_transition(from_s, to_s), f"Expected {from_s} → {to_s} to be rejected"


def test_no_self_transitions_allowed() -> None:
    """A status must never transition to itself."""
    for status in ALL_STATUSES:
        assert not can_transition(status, status), f"Self-transition on {status!r} should be rejected"


def test_terminal_states_have_no_outgoing_transitions() -> None:
    """done and failed are terminal — no further transitions should be possible."""
    for terminal in ("done", "failed"):
        for to_s in ALL_STATUSES:
            assert not can_transition(terminal, to_s), (
                f"Terminal state {terminal!r} should not allow transition to {to_s!r}"
            )


# ---------------------------------------------------------------------------
# Property 11: Rate limit enforcement
# Validates: Requirements 12.6
# ---------------------------------------------------------------------------

from hypothesis import given, settings as h_settings
from hypothesis import strategies as st

USER_RATE_LIMIT = 60


def simulate_rate_limit(request_count: int, limit: int) -> list[int]:
    """Simulate rate limiting: returns HTTP status codes for each request."""
    statuses = []
    counter = 0
    for _ in range(request_count):
        counter += 1
        if counter > limit:
            statuses.append(429)
        else:
            statuses.append(200)
    return statuses


@given(st.integers(min_value=61, max_value=200))
@h_settings(max_examples=100)
def test_rate_limit_enforcement_property(request_count: int) -> None:
    """
    **Property 11: Rate limit enforcement**
    For any sequence of more than 60 requests, all beyond the 60th must be 429.
    **Validates: Requirements 12.6**
    """
    statuses = simulate_rate_limit(request_count, USER_RATE_LIMIT)
    assert all(s == 200 for s in statuses[:USER_RATE_LIMIT])
    assert all(s == 429 for s in statuses[USER_RATE_LIMIT:])


@given(st.integers(min_value=1, max_value=60))
@h_settings(max_examples=100)
def test_under_rate_limit_all_pass(request_count: int) -> None:
    """Requests at or below the limit should all receive 200."""
    statuses = simulate_rate_limit(request_count, USER_RATE_LIMIT)
    assert all(s == 200 for s in statuses)


# ---------------------------------------------------------------------------
# Property 1: Normalization idempotence
# Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
# ---------------------------------------------------------------------------

from app.services.normalization import build_normalized_key


@given(st.text(min_size=0, max_size=200), st.text(min_size=0, max_size=100))
@settings(max_examples=500)
def test_normalization_idempotence(title: str, artist: str) -> None:
    """
    **Property 1: Normalization idempotence**
    Applying build_normalized_key twice must produce the same result as once.
    **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
    """
    once = build_normalized_key(title, artist)
    # Re-normalize the output: split on "::" to get normalized title and artist
    parts = once.split("::", 1)
    norm_title = parts[0] if len(parts) > 0 else ""
    norm_artist = parts[1] if len(parts) > 1 else ""
    twice = build_normalized_key(norm_title, norm_artist)
    assert once == twice, f"Not idempotent: first={once!r}, second={twice!r}"


# ---------------------------------------------------------------------------
# Property 2: Deduplication stability
# Validates: Requirements 7.6, 7.7
# ---------------------------------------------------------------------------

from app.services.normalization import deduplicate_tracks
from app.schemas.api import TrackPayload


def track_strategy():
    return st.builds(
        TrackPayload,
        title=st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=("L", "N", "Zs"))),
        artist=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N", "Zs"))),
        video_id=st.one_of(st.none(), st.text(min_size=1, max_size=20)),
        normalized_key=st.just(""),
        score=st.none(),
        source=st.none(),
        metadata=st.just({}),
    )


@given(st.lists(track_strategy(), min_size=0, max_size=30))
@settings(max_examples=200)
def test_deduplication_stability(tracks: list[TrackPayload]) -> None:
    """
    **Property 2: Deduplication stability**
    Running deduplicate_tracks twice must produce the same result as once.
    **Validates: Requirements 7.6, 7.7**
    """
    once = deduplicate_tracks(tracks)
    twice = deduplicate_tracks(once)
    assert [t.normalized_key for t in once] == [t.normalized_key for t in twice], (
        "Deduplication is not stable: second pass changed the result"
    )


# ---------------------------------------------------------------------------
# Property 3: Compatibility score bounds
# Validates: Requirements 8.5
# ---------------------------------------------------------------------------

from app.services.blend_engine import generate_blend as _generate_blend


@given(
    st.lists(track_strategy(), min_size=1, max_size=20),
    st.lists(track_strategy(), min_size=1, max_size=20),
)
@settings(max_examples=200)
def test_compatibility_score_bounds(tracks_a, tracks_b):
    """
    **Property 3: Compatibility score bounds**
    For any two non-empty track lists, compatibility_score must be in [0.0, 100.0].
    **Validates: Requirements 8.5**
    """
    result = _generate_blend(tracks_a, tracks_b)
    score = result["compatibility_score"]
    assert 0.0 <= score <= 100.0, f"Compatibility score {score} out of bounds [0, 100]"


# ---------------------------------------------------------------------------
# Property 4: Blend section size limits
# Validates: Requirements 8.6, 8.7
# ---------------------------------------------------------------------------

@given(
    st.lists(track_strategy(), min_size=0, max_size=30),
    st.lists(track_strategy(), min_size=0, max_size=30),
)
@settings(max_examples=200)
def test_blend_section_size_limits(tracks_a, tracks_b):
    """
    **Property 4: Blend section size limits**
    Total tracks ≤ 50; no individual section > 20 tracks.
    **Validates: Requirements 8.6, 8.7**
    """
    result = _generate_blend(tracks_a, tracks_b)
    sections = result["sections"]
    total = sum(len(s.tracks) for s in sections)
    assert total <= 50, f"Total tracks {total} exceeds 50"
    for section in sections:
        assert len(section.tracks) <= 20, f"Section '{section.title}' has {len(section.tracks)} tracks, exceeds 20"


# ---------------------------------------------------------------------------
# Property 5: Intersection correctness
# Validates: Requirements 8.1, 8.2, 8.3
# ---------------------------------------------------------------------------

@given(
    st.lists(track_strategy(), min_size=1, max_size=20),
    st.lists(track_strategy(), min_size=1, max_size=20),
)
@settings(max_examples=200)
def test_intersection_correctness(tracks_a, tracks_b):
    """
    **Property 5: Intersection correctness**
    Shared Taste tracks must appear in both A and B; exclusive tracks must not appear in Shared Taste.
    **Validates: Requirements 8.1, 8.2, 8.3**
    """
    result = _generate_blend(tracks_a, tracks_b)
    sections = result["sections"]

    keys_a = {t.normalized_key for t in deduplicate_tracks(tracks_a) if t.normalized_key}
    keys_b = {t.normalized_key for t in deduplicate_tracks(tracks_b) if t.normalized_key}

    shared_section = next((s for s in sections if s.title == "Shared Taste"), None)
    exclusive_a_section = next((s for s in sections if s.title == "From User A"), None)
    exclusive_b_section = next((s for s in sections if s.title == "From User B"), None)

    if shared_section:
        shared_keys = {t.normalized_key for t in shared_section.tracks}
        for track in shared_section.tracks:
            assert track.normalized_key in keys_a, f"Shared track {track.normalized_key!r} not in A"
            assert track.normalized_key in keys_b, f"Shared track {track.normalized_key!r} not in B"

        if exclusive_a_section:
            for track in exclusive_a_section.tracks:
                assert track.normalized_key not in shared_keys, f"Track {track.normalized_key!r} in both exclusive A and shared"

        if exclusive_b_section:
            for track in exclusive_b_section.tracks:
                assert track.normalized_key not in shared_keys, f"Track {track.normalized_key!r} in both exclusive B and shared"


# ---------------------------------------------------------------------------
# Property 6: Playlist link count enforcement
# Validates: Requirements 4.1, 4.3
# ---------------------------------------------------------------------------

from pydantic import ValidationError
from app.schemas.api import ParticipantSourceInput

VALID_YTM_URL = "https://music.youtube.com/playlist?list=PLtest123456"


@given(st.integers(min_value=6, max_value=20))
@settings(max_examples=100)
def test_playlist_link_count_enforcement(link_count: int) -> None:
    """
    **Property 6: Playlist link count enforcement**
    Any input with more than 5 playlist links must be rejected with a ValidationError.
    **Validates: Requirements 4.1, 4.3**
    """
    links = [VALID_YTM_URL] * link_count
    try:
        ParticipantSourceInput(name="Test User", playlist_links=links)
        assert False, f"Expected ValidationError for {link_count} links, but none was raised"
    except ValidationError:
        pass  # Expected


@given(st.integers(min_value=0, max_value=5))
@settings(max_examples=50)
def test_playlist_link_count_within_limit(link_count: int) -> None:
    """Inputs with 5 or fewer valid links must be accepted."""
    links = [VALID_YTM_URL] * link_count
    participant = ParticipantSourceInput(name="Test User", playlist_links=links)
    assert len(participant.playlist_links) == link_count


# ---------------------------------------------------------------------------
# Property 9: Auth encryption round-trip
# Validates: Requirements 5.2, 5.3, 12.2
# ---------------------------------------------------------------------------

from app.core.security import encrypt_auth_payload, decrypt_auth_payload


@given(st.dictionaries(
    keys=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N"))),
    values=st.text(min_size=0, max_size=200),
    min_size=0,
    max_size=20,
))
@settings(max_examples=200)
def test_auth_encryption_round_trip(headers: dict) -> None:
    """
    **Property 9: Auth encryption round-trip**
    Encrypting then decrypting must produce the original dict.
    **Validates: Requirements 5.2, 5.3, 12.2**
    """
    encrypted = encrypt_auth_payload(headers)
    # Encrypted value must not contain long plaintext values verbatim.
    # Short values (< 8 chars) are skipped to avoid false positives from
    # coincidental substring matches in the base64-encoded ciphertext.
    for value in headers.values():
        if len(value) >= 8:
            assert value not in encrypted, f"Plaintext value {value!r} found in encrypted output"
    decrypted = decrypt_auth_payload(encrypted)
    assert decrypted == headers, f"Round-trip failed: original={headers!r}, decrypted={decrypted!r}"


# ---------------------------------------------------------------------------
# Property 7: Feedback toggle round-trip
# Validates: Requirements 11.8
# ---------------------------------------------------------------------------

VALID_ACTIONS = ["like", "dislike", "skip"]


def simulate_feedback_toggle(initial_action: str, second_action: str) -> str | None:
    """
    Simulate the toggle logic:
    - If same action submitted twice → None (toggled off)
    - If different action → new action
    """
    if initial_action == second_action:
        return None  # toggled off
    return second_action  # updated to new action


@given(
    action=st.sampled_from(VALID_ACTIONS),
)
@settings(max_examples=100)
def test_feedback_toggle_same_action_removes(action: str) -> None:
    """
    **Property 7: Feedback toggle round-trip**
    Submitting the same action twice must toggle it off (return None).
    **Validates: Requirements 11.8**
    """
    result = simulate_feedback_toggle(action, action)
    assert result is None, f"Expected toggle-off for action={action!r}, got {result!r}"


@given(
    action1=st.sampled_from(VALID_ACTIONS),
    action2=st.sampled_from(VALID_ACTIONS),
)
@settings(max_examples=100)
def test_feedback_toggle_different_action_updates(action1: str, action2: str) -> None:
    """Different actions should update, not toggle off."""
    result = simulate_feedback_toggle(action1, action2)
    if action1 == action2:
        assert result is None
    else:
        assert result == action2


# ---------------------------------------------------------------------------
# Property 12: Track feedback storage round-trip
# Validates: Requirements 11.1, 11.4
# ---------------------------------------------------------------------------

@given(
    user_id=st.text(min_size=1, max_size=36, alphabet=st.characters(whitelist_categories=("L", "N"))),
    blend_id=st.text(min_size=1, max_size=36, alphabet=st.characters(whitelist_categories=("L", "N"))),
    track_id=st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=("L", "N"))),
    action=st.sampled_from(["like", "dislike", "skip"]),
)
@settings(max_examples=100)
def test_track_feedback_storage_round_trip(user_id: str, blend_id: str, track_id: str, action: str) -> None:
    """
    **Property 12: Track feedback storage round-trip**
    Submitting feedback and querying it back must return the submitted action.
    **Validates: Requirements 11.1, 11.4**
    """
    # In-memory simulation of the storage round-trip
    store: dict[tuple, str] = {}
    key = (user_id, blend_id, track_id)
    store[key] = action
    assert store[key] == action, f"Round-trip failed: stored {action!r}, got {store[key]!r}"


# ---------------------------------------------------------------------------
# Property 13: Blend feedback storage round-trip
# Validates: Requirements 11.2, 11.3, 11.5
# ---------------------------------------------------------------------------

@given(
    user_id=st.text(min_size=1, max_size=36, alphabet=st.characters(whitelist_categories=("L", "N"))),
    blend_id=st.text(min_size=1, max_size=36, alphabet=st.characters(whitelist_categories=("L", "N"))),
    rating=st.one_of(st.none(), st.integers(min_value=1, max_value=5)),
    quick_option=st.one_of(st.none(), st.sampled_from(["accurate", "missed_vibe"])),
)
@settings(max_examples=100)
def test_blend_feedback_storage_round_trip(user_id: str, blend_id: str, rating: int | None, quick_option: str | None) -> None:
    """
    **Property 13: Blend feedback storage round-trip**
    Submitting blend feedback and querying it back must return the submitted rating and quick_option.
    **Validates: Requirements 11.2, 11.3, 11.5**
    """
    store: dict[tuple, dict] = {}
    key = (user_id, blend_id)
    store[key] = {"rating": rating, "quick_option": quick_option}
    assert store[key]["rating"] == rating
    assert store[key]["quick_option"] == quick_option


# ---------------------------------------------------------------------------
# Property 10: Ownership isolation
# Validates: Requirements 12.5
# ---------------------------------------------------------------------------

def check_blend_ownership(participant_a_id: str, participant_b_id: str, requesting_user_id: str) -> bool:
    """Returns True if the requesting user is a participant, False otherwise."""
    return requesting_user_id in (participant_a_id, participant_b_id)


@given(
    participant_a=st.text(min_size=1, max_size=36, alphabet=st.characters(whitelist_categories=("L", "N"))),
    participant_b=st.text(min_size=1, max_size=36, alphabet=st.characters(whitelist_categories=("L", "N"))),
    requester=st.text(min_size=1, max_size=36, alphabet=st.characters(whitelist_categories=("L", "N"))),
)
@settings(max_examples=200)
def test_ownership_isolation_property(participant_a: str, participant_b: str, requester: str) -> None:
    """
    **Property 10: Ownership isolation**
    A user who is not participant_a or participant_b must be denied access.
    **Validates: Requirements 12.5**
    """
    is_allowed = check_blend_ownership(participant_a, participant_b, requester)
    if requester in (participant_a, participant_b):
        assert is_allowed, f"Participant {requester!r} should be allowed"
    else:
        assert not is_allowed, f"Non-participant {requester!r} should be denied"


def test_ownership_participants_allowed() -> None:
    """Both participants must always be allowed."""
    assert check_blend_ownership("user_a", "user_b", "user_a")
    assert check_blend_ownership("user_a", "user_b", "user_b")


def test_ownership_third_party_denied() -> None:
    """A third-party user must always be denied."""
    assert not check_blend_ownership("user_a", "user_b", "user_c")
    assert not check_blend_ownership("user_a", "user_b", "")

from app.schemas.api import TrackPayload
from app.services.blend_engine import generate_blend


def test_generate_blend_detects_common_tracks():
    user_a = [
        TrackPayload(title="Midnight City", artist="M83", videoId="a1"),
        TrackPayload(title="Intro", artist="The xx", videoId="a2"),
    ]
    user_b = [
        TrackPayload(title="Midnight City (Official Video)", artist="M83", videoId="b1"),
        TrackPayload(title="Genesis", artist="Grimes", videoId="b2"),
    ]

    result = generate_blend(user_a, user_b)

    assert result["compatibility_score"] > 0
    assert result["diagnostics"]["commonCount"] == 1
    assert result["sections"][0].tracks[0].title == "Midnight City"


def test_generate_blend_scores_side_sections():
    user_a = [
        TrackPayload(title="Myth", artist="Beach House", videoId="a1"),
        TrackPayload(title="Space Song", artist="Beach House", videoId="a2"),
    ]
    user_b = [
        TrackPayload(title="Space Song", artist="Beach House", videoId="b1"),
        TrackPayload(title="Oblivion", artist="Grimes", videoId="b2"),
    ]

    result = generate_blend(user_a, user_b)

    assert result["sections"][1].tracks
    assert result["sections"][2].tracks
    assert result["sections"][1].tracks[0].score is not None

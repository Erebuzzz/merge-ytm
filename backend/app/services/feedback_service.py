from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import BlendFeedback, TrackFeedback

logger = logging.getLogger(__name__)


@dataclass
class TrackStats:
    track_id: str
    like_count: int
    dislike_count: int
    skip_count: int
    like_ratio: float  # likes / (likes + dislikes + skips)
    skip_rate: float   # skips / total


@dataclass
class BlendStats:
    blend_id: str
    average_rating: float | None
    feedback_count: int
    accurate_count: int
    missed_vibe_count: int


class FeedbackService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record_track_feedback(
        self,
        user_id: str,
        blend_id: str,
        track_id: str,
        action: str,
    ) -> TrackFeedback | None:
        """
        Upsert track feedback. If the same action is submitted again, toggle it off (delete).
        Returns the record if created/updated, None if toggled off.
        """
        existing = self.db.scalars(
            select(TrackFeedback).where(
                TrackFeedback.user_id == user_id,
                TrackFeedback.blend_id == blend_id,
                TrackFeedback.track_id == track_id,
            )
        ).first()

        if existing:
            if existing.action == action:
                # Toggle off: same action submitted again → remove
                self.db.delete(existing)
                self.db.commit()
                return None
            else:
                # Update to new action
                existing.action = action
                self.db.commit()
                return existing
        else:
            record = TrackFeedback(
                user_id=user_id,
                blend_id=blend_id,
                track_id=track_id,
                action=action,
            )
            self.db.add(record)
            self.db.commit()
            return record

    def record_blend_feedback(
        self,
        user_id: str,
        blend_id: str,
        rating: int | None,
        quick_option: str | None,
    ) -> BlendFeedback:
        """Upsert blend-level feedback."""
        existing = self.db.scalars(
            select(BlendFeedback).where(
                BlendFeedback.user_id == user_id,
                BlendFeedback.blend_id == blend_id,
            )
        ).first()

        if existing:
            if rating is not None:
                existing.rating = rating
            if quick_option is not None:
                existing.quick_option = quick_option
            self.db.commit()
            return existing
        else:
            record = BlendFeedback(
                user_id=user_id,
                blend_id=blend_id,
                rating=rating,
                quick_option=quick_option,
            )
            self.db.add(record)
            self.db.commit()
            return record

    def compute_track_stats(self, track_id: str) -> TrackStats:
        """Compute like ratio and skip rate for a track."""
        rows = self.db.execute(
            select(TrackFeedback.action, func.count().label("cnt"))
            .where(TrackFeedback.track_id == track_id)
            .group_by(TrackFeedback.action)
        ).all()

        counts = {row.action: row.cnt for row in rows}
        likes = counts.get("like", 0)
        dislikes = counts.get("dislike", 0)
        skips = counts.get("skip", 0)
        total = likes + dislikes + skips

        return TrackStats(
            track_id=track_id,
            like_count=likes,
            dislike_count=dislikes,
            skip_count=skips,
            like_ratio=likes / total if total > 0 else 0.0,
            skip_rate=skips / total if total > 0 else 0.0,
        )

    def compute_blend_stats(self, blend_id: str) -> BlendStats:
        """Compute average rating and feedback coverage for a blend."""
        rows = self.db.scalars(
            select(BlendFeedback).where(BlendFeedback.blend_id == blend_id)
        ).all()

        ratings = [r.rating for r in rows if r.rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else None
        accurate = sum(1 for r in rows if r.quick_option == "accurate")
        missed = sum(1 for r in rows if r.quick_option == "missed_vibe")

        return BlendStats(
            blend_id=blend_id,
            average_rating=avg_rating,
            feedback_count=len(rows),
            accurate_count=accurate,
            missed_vibe_count=missed,
        )

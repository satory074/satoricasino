"""Tests for the daily-bonus login-streak logic (with one-day grace)."""

from __future__ import annotations

from backend.main import compute_daily_streak


class TestComputeDailyStreak:
    def test_consecutive_day_increments(self):
        assert compute_daily_streak("2026-06-06", "2026-06-07", 3) == 4

    def test_one_day_grace_keeps_streak(self):
        # Missing a single day (gap of 2) still continues the streak.
        assert compute_daily_streak("2026-06-05", "2026-06-07", 3) == 4

    def test_two_day_gap_resets(self):
        # Missing two or more days resets to day 1.
        assert compute_daily_streak("2026-06-04", "2026-06-07", 3) == 1

    def test_no_prior_claim_starts_at_one(self):
        assert compute_daily_streak(None, "2026-06-07", 0) == 1

    def test_caps_at_seven(self):
        assert compute_daily_streak("2026-06-06", "2026-06-07", 7) == 7

    def test_wrapped_streak_restarts_from_one(self):
        # After day 7 the stored streak is 0; next claim becomes day 1.
        assert compute_daily_streak("2026-06-06", "2026-06-07", 0) == 1

    def test_malformed_date_resets(self):
        assert compute_daily_streak("not-a-date", "2026-06-07", 5) == 1

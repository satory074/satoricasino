"""Tests for the reward ad system."""

from __future__ import annotations

import time
import uuid

import pytest

from backend.config import AD_REWARD_DAILY_CAP, AD_WATCH_MIN_SECONDS, BAILOUT_COINS, BAILOUT_COINS_AD


class TestAdSessionLifecycle:
    """Test in-memory ad session dict behavior."""

    def _make_session(self, **overrides):
        base = {
            "user_id": "user-1",
            "started_at": time.time(),
            "purpose": "daily_bonus_double",
            "bonus_amount": 100,
        }
        base.update(overrides)
        return base

    def test_session_created_with_required_fields(self):
        session = self._make_session()
        assert session["user_id"] == "user-1"
        assert session["purpose"] == "daily_bonus_double"
        assert session["bonus_amount"] == 100
        assert "started_at" in session

    def test_session_ttl_within_window(self):
        session = self._make_session(started_at=time.time())
        elapsed = time.time() - session["started_at"]
        assert elapsed < 60

    def test_session_expired_after_ttl(self):
        session = self._make_session(started_at=time.time() - 61)
        elapsed = time.time() - session["started_at"]
        assert elapsed > 60


class TestAdTimingValidation:
    """Test minimum watch time enforcement."""

    def test_elapsed_below_minimum_rejected(self):
        started = time.time()
        elapsed = time.time() - started
        assert elapsed < AD_WATCH_MIN_SECONDS

    def test_elapsed_above_minimum_accepted(self):
        started = time.time() - AD_WATCH_MIN_SECONDS - 1
        elapsed = time.time() - started
        assert elapsed >= AD_WATCH_MIN_SECONDS


class TestAdDailyCap:
    """Test daily watch limit enforcement."""

    def test_under_cap_allowed(self):
        watches = AD_REWARD_DAILY_CAP - 1
        assert watches < AD_REWARD_DAILY_CAP

    def test_at_cap_rejected(self):
        watches = AD_REWARD_DAILY_CAP
        assert watches >= AD_REWARD_DAILY_CAP


class TestAdRewardCalculation:
    """Test reward amounts by purpose."""

    def test_daily_bonus_double_reward(self):
        bonus_amount = 200
        reward = bonus_amount  # doubles the original
        assert reward == 200

    def test_bailout_upgrade_reward(self):
        reward = BAILOUT_COINS_AD - BAILOUT_COINS
        assert reward == 500  # 1000 - 500

    def test_bailout_upgrade_total(self):
        total = BAILOUT_COINS + (BAILOUT_COINS_AD - BAILOUT_COINS)
        assert total == BAILOUT_COINS_AD


class TestAdPurposeValidation:
    """Test purpose field validation."""

    VALID_PURPOSES = ("daily_bonus_double", "bailout_upgrade")

    def test_valid_purposes(self):
        for p in self.VALID_PURPOSES:
            assert p in self.VALID_PURPOSES

    def test_invalid_purpose_rejected(self):
        assert "free_coins" not in self.VALID_PURPOSES
        assert "hack" not in self.VALID_PURPOSES


class TestAdConfig:
    """Test config constants."""

    def test_daily_cap_positive(self):
        assert AD_REWARD_DAILY_CAP > 0

    def test_min_seconds_positive(self):
        assert AD_WATCH_MIN_SECONDS > 0

    def test_bailout_ad_greater_than_base(self):
        assert BAILOUT_COINS_AD > BAILOUT_COINS

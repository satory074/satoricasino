"""Tests for the achievement and XP system."""

from __future__ import annotations

import pytest

from backend.achievements import check_achievements, get_all_achievements_with_progress
from backend.database import calculate_level, xp_for_level


class TestCheckAchievements:
    def _user(self, **overrides) -> dict:
        base = {
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "coins": 1000,
            "game_stats": {},
            "best_streaks": {},
            "unlocked_achievements": {},
        }
        base.update(overrides)
        return base

    def test_no_achievements_for_fresh_user(self):
        assert check_achievements(self._user()) == []

    def test_first_win(self):
        newly = check_achievements(self._user(wins=1))
        assert "first_win" in newly

    def test_already_unlocked_not_repeated(self):
        user = self._user(wins=1, unlocked_achievements={"first_win": "2025-01-01"})
        newly = check_achievements(user)
        assert "first_win" not in newly

    def test_multiple_thresholds(self):
        user = self._user(wins=50)
        newly = check_achievements(user)
        assert "first_win" in newly
        assert "wins_10" in newly
        assert "wins_50" in newly
        assert "wins_100" not in newly

    def test_game_specific_wins(self):
        user = self._user(
            game_stats={"blackjack": {"wins": 25, "losses": 5, "draws": 0,
                                       "total_wagered": 1000, "total_won": 500,
                                       "biggest_win": 100, "hands_played": 30}}
        )
        newly = check_achievements(user)
        assert "bj_first_win" in newly
        assert "bj_wins_25" in newly
        assert "bj_wins_100" not in newly

    def test_streak_achievements(self):
        user = self._user(best_streaks={"blackjack": 5})
        newly = check_achievements(user)
        assert "streak_3" in newly
        assert "streak_5" in newly
        assert "streak_10" not in newly

    def test_big_win(self):
        user = self._user(
            game_stats={"blackjack": {"wins": 0, "losses": 0, "draws": 0,
                                       "total_wagered": 0, "total_won": 0,
                                       "biggest_win": 1000, "hands_played": 1}}
        )
        newly = check_achievements(user)
        assert "big_win_500" in newly
        assert "big_win_1000" in newly
        assert "big_win_5000" not in newly

    def test_coins_achievement(self):
        user = self._user(coins=5000)
        newly = check_achievements(user)
        assert "coins_5k" in newly
        assert "coins_10k" not in newly

    def test_hands_played(self):
        user = self._user(
            game_stats={
                "blackjack": {"wins": 0, "losses": 0, "draws": 0,
                              "total_wagered": 0, "total_won": 0,
                              "biggest_win": 0, "hands_played": 60},
                "chinchiro": {"wins": 0, "losses": 0, "draws": 0,
                              "total_wagered": 0, "total_won": 0,
                              "biggest_win": 0, "hands_played": 50},
            }
        )
        newly = check_achievements(user)
        assert "hands_100" in newly

    def test_wagered_total(self):
        user = self._user(
            game_stats={
                "blackjack": {"wins": 0, "losses": 0, "draws": 0,
                              "total_wagered": 6000, "total_won": 0,
                              "biggest_win": 0, "hands_played": 10},
                "chinchiro": {"wins": 0, "losses": 0, "draws": 0,
                              "total_wagered": 5000, "total_won": 0,
                              "biggest_win": 0, "hands_played": 10},
            }
        )
        newly = check_achievements(user)
        assert "wagered_10k" in newly


class TestGetAllWithProgress:
    def test_returns_all_achievements(self):
        user = {"wins": 5, "game_stats": {}, "best_streaks": {},
                "unlocked_achievements": {}, "coins": 100}
        result = get_all_achievements_with_progress(user)
        assert len(result) > 20
        first_win = next(a for a in result if a["id"] == "first_win")
        assert first_win["progress"] == 1  # clamped to threshold
        assert first_win["threshold"] == 1
        assert first_win["unlocked"] is False


class TestXPSystem:
    def test_level_1_at_zero(self):
        assert calculate_level(0) == 1

    def test_level_2_at_100(self):
        assert calculate_level(100) == 2

    def test_level_5_at_1600(self):
        assert calculate_level(1600) == 5

    def test_level_10_at_8100(self):
        assert calculate_level(8100) == 10

    def test_xp_for_level_roundtrip(self):
        for lvl in [1, 2, 5, 10, 20]:
            xp = xp_for_level(lvl)
            assert calculate_level(xp) == lvl

    def test_negative_xp(self):
        assert calculate_level(-10) == 1

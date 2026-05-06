"""Achievement definitions and checking logic.

Each achievement is a dict with:
  id: str           — unique key
  category: str     — grouping (general, blackjack, chinchiro, streak, social)
  threshold: int    — numeric target (e.g. 10 wins)
  check: callable   — (user_data) -> current_progress: int

All checks are pure functions over the user document (no extra DB calls).
"""

from __future__ import annotations

from typing import Callable

# Type alias for check functions
CheckFn = Callable[[dict], int]


def _total_wins(u: dict) -> int:
    return u.get("wins", 0)


def _total_losses(u: dict) -> int:
    return u.get("losses", 0)


def _total_hands(u: dict) -> int:
    gs = u.get("game_stats", {})
    return sum(e.get("hands_played", 0) for e in gs.values())


def _bj_wins(u: dict) -> int:
    return u.get("game_stats", {}).get("blackjack", {}).get("wins", 0)


def _cc_wins(u: dict) -> int:
    return u.get("game_stats", {}).get("chinchiro", {}).get("wins", 0)


def _bj_hands(u: dict) -> int:
    return u.get("game_stats", {}).get("blackjack", {}).get("hands_played", 0)


def _cc_hands(u: dict) -> int:
    return u.get("game_stats", {}).get("chinchiro", {}).get("hands_played", 0)


def _biggest_win_any(u: dict) -> int:
    gs = u.get("game_stats", {})
    return max((e.get("biggest_win", 0) for e in gs.values()), default=0)


def _best_streak_any(u: dict) -> int:
    bs = u.get("best_streaks", {})
    return max(bs.values(), default=0)


def _daily_streak(u: dict) -> int:
    return u.get("daily_streak", 0)


def _total_wagered(u: dict) -> int:
    gs = u.get("game_stats", {})
    return sum(e.get("total_wagered", 0) for e in gs.values())


def _coins(u: dict) -> int:
    return u.get("coins", 0)


ACHIEVEMENTS: list[dict] = [
    # --- General ---
    {"id": "first_win", "category": "general", "threshold": 1, "check": _total_wins},
    {"id": "wins_10", "category": "general", "threshold": 10, "check": _total_wins},
    {"id": "wins_50", "category": "general", "threshold": 50, "check": _total_wins},
    {"id": "wins_100", "category": "general", "threshold": 100, "check": _total_wins},
    {"id": "wins_500", "category": "general", "threshold": 500, "check": _total_wins},
    {"id": "hands_100", "category": "general", "threshold": 100, "check": _total_hands},
    {"id": "hands_500", "category": "general", "threshold": 500, "check": _total_hands},
    {"id": "hands_1000", "category": "general", "threshold": 1000, "check": _total_hands},
    {"id": "wagered_10k", "category": "general", "threshold": 10000, "check": _total_wagered},
    {"id": "wagered_100k", "category": "general", "threshold": 100000, "check": _total_wagered},

    # --- Blackjack ---
    {"id": "bj_first_win", "category": "blackjack", "threshold": 1, "check": _bj_wins},
    {"id": "bj_wins_25", "category": "blackjack", "threshold": 25, "check": _bj_wins},
    {"id": "bj_wins_100", "category": "blackjack", "threshold": 100, "check": _bj_wins},
    {"id": "bj_veteran", "category": "blackjack", "threshold": 200, "check": _bj_hands},

    # --- Chinchiro ---
    {"id": "cc_first_win", "category": "chinchiro", "threshold": 1, "check": _cc_wins},
    {"id": "cc_wins_25", "category": "chinchiro", "threshold": 25, "check": _cc_wins},
    {"id": "cc_wins_100", "category": "chinchiro", "threshold": 100, "check": _cc_wins},
    {"id": "cc_veteran", "category": "chinchiro", "threshold": 200, "check": _cc_hands},

    # --- Streaks ---
    {"id": "streak_3", "category": "streak", "threshold": 3, "check": _best_streak_any},
    {"id": "streak_5", "category": "streak", "threshold": 5, "check": _best_streak_any},
    {"id": "streak_10", "category": "streak", "threshold": 10, "check": _best_streak_any},

    # --- Big wins ---
    {"id": "big_win_500", "category": "general", "threshold": 500, "check": _biggest_win_any},
    {"id": "big_win_1000", "category": "general", "threshold": 1000, "check": _biggest_win_any},
    {"id": "big_win_5000", "category": "general", "threshold": 5000, "check": _biggest_win_any},

    # --- Wealth ---
    {"id": "coins_5k", "category": "general", "threshold": 5000, "check": _coins},
    {"id": "coins_10k", "category": "general", "threshold": 10000, "check": _coins},
    {"id": "coins_50k", "category": "general", "threshold": 50000, "check": _coins},
]


def check_achievements(user_data: dict) -> list[str]:
    """Return list of newly unlocked achievement IDs.

    Compares current progress against thresholds and the user's
    `unlocked_achievements` map. Returns only *new* unlocks.
    """
    unlocked = user_data.get("unlocked_achievements", {})
    newly = []
    for ach in ACHIEVEMENTS:
        aid = ach["id"]
        if aid in unlocked:
            continue
        progress = ach["check"](user_data)
        if progress >= ach["threshold"]:
            newly.append(aid)
    return newly


def get_all_achievements_with_progress(user_data: dict) -> list[dict]:
    """Return all achievements with current progress for the frontend."""
    unlocked = user_data.get("unlocked_achievements", {})
    result = []
    for ach in ACHIEVEMENTS:
        aid = ach["id"]
        progress = ach["check"](user_data)
        result.append({
            "id": aid,
            "category": ach["category"],
            "threshold": ach["threshold"],
            "progress": min(progress, ach["threshold"]),
            "unlocked": aid in unlocked,
            "unlocked_at": unlocked.get(aid),
        })
    return result

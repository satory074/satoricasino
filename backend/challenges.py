"""Daily challenge definitions and selection.

Challenges are deterministically assigned per-user per-day using a hash of
user_id + date. Each user gets 3 daily challenges. No persistent definition
storage needed — the hash is the source of truth.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Callable

CheckFn = Callable[[dict], int]


# --- Check functions ---

def _hands_played(u: dict) -> int:
    gs = u.get("game_stats", {})
    return sum(e.get("hands_played", 0) for e in gs.values())


def _bj_hands(u: dict) -> int:
    return u.get("game_stats", {}).get("blackjack", {}).get("hands_played", 0)


def _cc_hands(u: dict) -> int:
    return u.get("game_stats", {}).get("chinchiro", {}).get("hands_played", 0)


def _total_wins(u: dict) -> int:
    return u.get("wins", 0)


def _bj_wins(u: dict) -> int:
    return u.get("game_stats", {}).get("blackjack", {}).get("wins", 0)


def _cc_wins(u: dict) -> int:
    return u.get("game_stats", {}).get("chinchiro", {}).get("wins", 0)


def _total_wagered(u: dict) -> int:
    gs = u.get("game_stats", {})
    return sum(e.get("total_wagered", 0) for e in gs.values())


# --- Challenge pool ---
# Each challenge has: id, target, reward (coins), check function
# 'target' is the absolute threshold the user needs to reach;
# progress is measured as (current - baseline), where baseline is
# snapshotted when the challenge period begins.

DAILY_CHALLENGES: list[dict] = [
    {"id": "play_5", "target": 5, "reward": 50, "check": _hands_played},
    {"id": "play_10", "target": 10, "reward": 100, "check": _hands_played},
    {"id": "win_3", "target": 3, "reward": 75, "check": _total_wins},
    {"id": "win_5", "target": 5, "reward": 125, "check": _total_wins},
    {"id": "bj_play_5", "target": 5, "reward": 60, "check": _bj_hands},
    {"id": "bj_win_3", "target": 3, "reward": 100, "check": _bj_wins},
    {"id": "cc_play_5", "target": 5, "reward": 60, "check": _cc_hands},
    {"id": "cc_win_3", "target": 3, "reward": 100, "check": _cc_wins},
    {"id": "wager_500", "target": 500, "reward": 50, "check": _total_wagered},
    {"id": "wager_1000", "target": 1000, "reward": 75, "check": _total_wagered},
    {"id": "wager_2000", "target": 2000, "reward": 125, "check": _total_wagered},
    {"id": "win_1", "target": 1, "reward": 30, "check": _total_wins},
]


def _pick_challenges(user_id: str, date_str: str, count: int = 3) -> list[dict]:
    """Deterministically pick `count` challenges for user+date."""
    seed = hashlib.sha256(f"{user_id}:{date_str}".encode()).hexdigest()
    seed_int = int(seed, 16)
    pool = list(DAILY_CHALLENGES)
    selected = []
    for i in range(min(count, len(pool))):
        idx = (seed_int + i * 7919) % len(pool)  # 7919 is a prime spread
        selected.append(pool.pop(idx))
    return selected


def get_daily_challenges(user_id: str, user_data: dict) -> list[dict]:
    """Return today's challenges with progress.

    Progress is computed as: current_value - baseline.
    Baseline is stored in user_data["challenges"]["daily"]["baselines"].
    If no baseline exists (first check today), it means the challenges
    endpoint hasn't been initialized yet for today — we return 0 progress.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    challenges = _pick_challenges(user_id, today)
    ch_data = user_data.get("challenges", {}).get("daily", {})
    baselines = ch_data.get("baselines", {})
    claimed = ch_data.get("claimed", [])
    date = ch_data.get("date", "")

    result = []
    for ch in challenges:
        current = ch["check"](user_data)
        baseline = baselines.get(ch["id"], current) if date == today else current
        progress = max(0, current - baseline)
        result.append({
            "id": ch["id"],
            "target": ch["target"],
            "reward": ch["reward"],
            "progress": min(progress, ch["target"]),
            "completed": progress >= ch["target"],
            "claimed": ch["id"] in claimed,
        })
    return result


def init_daily_baselines(user_id: str, user_data: dict) -> dict:
    """Create baseline snapshot for today's challenges.

    Returns the baselines dict to be stored on the user document.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    challenges = _pick_challenges(user_id, today)
    baselines = {}
    for ch in challenges:
        baselines[ch["id"]] = ch["check"](user_data)
    return {"date": today, "baselines": baselines, "claimed": []}


def get_challenge_by_id(user_id: str, challenge_id: str) -> dict | None:
    """Look up a specific challenge from today's set."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    challenges = _pick_challenges(user_id, today)
    for ch in challenges:
        if ch["id"] == challenge_id:
            return ch
    return None

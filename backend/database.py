from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore

from backend.config import INITIAL_COINS

_db = None


def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        _db = firestore.client()
    return _db


async def create_user(display_name: str) -> dict:
    db = get_db()
    user_id = str(uuid.uuid4())
    user_data = {
        "user_id": user_id,
        "display_name": display_name,
        "coins": INITIAL_COINS,
        "wins": 0,
        "losses": 0,
        "draws": 0,
        "last_daily_bonus": None,
        "last_bailout": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.collection("users").document(user_id).set(user_data)
    return user_data


async def get_user_by_name(display_name: str) -> Optional[dict]:
    db = get_db()
    docs = (
        db.collection("users")
        .where("display_name", "==", display_name)
        .limit(1)
        .get()
    )
    for doc in docs:
        return doc.to_dict()
    return None


async def get_user(user_id: str) -> Optional[dict]:
    db = get_db()
    doc = db.collection("users").document(user_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


async def update_user(user_id: str, data: dict) -> None:
    db = get_db()
    db.collection("users").document(user_id).update(data)


async def update_game_stats(
    user_id: str, game_type: str, payout: int, bet: int
) -> None:
    """Increment per-game career statistics atomically."""
    db = get_db()
    user_ref = db.collection("users").document(user_id)

    @firestore.transactional
    def _update(transaction):
        snapshot = user_ref.get(transaction=transaction)
        if not snapshot.exists:
            return
        data = snapshot.to_dict()
        gs = data.get("game_stats", {})
        entry = gs.get(game_type, {
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "total_wagered": 0,
            "total_won": 0,
            "biggest_win": 0,
            "hands_played": 0,
        })
        entry["hands_played"] = entry.get("hands_played", 0) + 1
        entry["total_wagered"] = entry.get("total_wagered", 0) + bet
        if payout > 0:
            entry["wins"] = entry.get("wins", 0) + 1
            entry["total_won"] = entry.get("total_won", 0) + payout
            if payout > entry.get("biggest_win", 0):
                entry["biggest_win"] = payout
        elif payout < 0:
            entry["losses"] = entry.get("losses", 0) + 1
        else:
            entry["draws"] = entry.get("draws", 0) + 1
        gs[game_type] = entry
        transaction.update(user_ref, {f"game_stats.{game_type}": entry})

    transaction = db.transaction()
    _update(transaction)


async def update_streaks(
    user_id: str, game_type: str, payout: int
) -> dict:
    """Update win/best streaks. Returns {current, best}."""
    db = get_db()
    user_ref = db.collection("users").document(user_id)

    @firestore.transactional
    def _update(transaction):
        snapshot = user_ref.get(transaction=transaction)
        if not snapshot.exists:
            return {"current": 0, "best": 0}
        data = snapshot.to_dict()
        streaks = data.get("streaks", {})
        best_streaks = data.get("best_streaks", {})
        current = streaks.get(game_type, 0)
        best = best_streaks.get(game_type, 0)

        if payout > 0:
            current += 1
        elif payout < 0:
            current = 0
        # draw: unchanged

        if current > best:
            best = current

        transaction.update(user_ref, {
            f"streaks.{game_type}": current,
            f"best_streaks.{game_type}": best,
        })
        return {"current": current, "best": best}

    transaction = db.transaction()
    return _update(transaction)


async def get_leaderboard(metric: str = "coins", limit: int = 10) -> list[dict]:
    """Fetch top players by coins or wins."""
    db = get_db()
    query = db.collection("users").order_by(
        metric, direction=firestore.Query.DESCENDING
    ).limit(limit)
    docs = query.get()
    result = []
    for doc in docs:
        d = doc.to_dict()
        result.append({
            "user_id": d.get("user_id", doc.id),
            "display_name": d.get("display_name", "???"),
            "coins": d.get("coins", 0),
            "wins": d.get("wins", 0),
        })
    return result


async def get_user_rank(user_id: str, metric: str = "coins") -> int | None:
    """Get user's 1-based rank by metric. Returns None if not found."""
    db = get_db()
    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        return None
    user_val = user_doc.to_dict().get(metric, 0)
    # Count how many users have a higher value
    higher = db.collection("users").where(metric, ">", user_val).get()
    return len(higher) + 1


async def update_coins(user_id: str, delta: int) -> int:
    db = get_db()
    user_ref = db.collection("users").document(user_id)

    @firestore.transactional
    def _update(transaction):
        snapshot = user_ref.get(transaction=transaction)
        current = snapshot.get("coins")
        new_coins = current + delta
        if new_coins < 0:
            raise ValueError("Insufficient coins")
        transaction.update(user_ref, {"coins": new_coins})
        return new_coins

    transaction = db.transaction()
    return _update(transaction)

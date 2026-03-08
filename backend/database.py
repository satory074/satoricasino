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

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from backend.config import JWT_ALGORITHM, JWT_EXPIRE_HOURS, SECRET_KEY


def create_token(user_id: str, display_name: str) -> str:
    payload = {
        "sub": user_id,
        "name": display_name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return {"user_id": payload["sub"], "display_name": payload["name"]}
    except JWTError:
        return None

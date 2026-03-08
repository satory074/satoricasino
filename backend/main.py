from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.auth import create_token, decode_token
from backend.config import (
    BAILOUT_COINS,
    DAILY_BONUS,
    PASSPHRASE,
    TABLE_MAX_PLAYERS,
    TURN_TIMEOUT_SECONDS,
)
from backend.database import create_user, get_user, get_user_by_name, update_coins, update_user
from backend.game.blackjack import BlackjackGame, Phase
from backend.models import (
    CreateTableRequest,
    LoginRequest,
    RegisterRequest,
    TableInfo,
    TokenResponse,
    UserProfile,
)
from backend.websocket_manager import manager

app = FastAPI(title="SatoriCasino")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory table storage
tables: dict[str, dict] = {}
# table_id -> { "name", "min_bet", "game": BlackjackGame, "creator_id" }

turn_timers: dict[str, asyncio.Task] = {}


def _get_current_user(token: str) -> dict:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


# --- Auth Routes ---

@app.post("/api/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    if req.passphrase != PASSPHRASE:
        raise HTTPException(status_code=403, detail="Wrong passphrase")
    if not req.display_name.strip():
        raise HTTPException(status_code=400, detail="Display name required")

    existing = await get_user_by_name(req.display_name)
    if existing:
        raise HTTPException(status_code=409, detail="Name already taken")

    user = await create_user(req.display_name.strip())
    token = create_token(user["user_id"], user["display_name"])
    return TokenResponse(token=token, user_id=user["user_id"], display_name=user["display_name"])


@app.post("/api/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    if req.passphrase != PASSPHRASE:
        raise HTTPException(status_code=403, detail="Wrong passphrase")

    user = await get_user_by_name(req.display_name)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_token(user["user_id"], user["display_name"])
    return TokenResponse(token=token, user_id=user["user_id"], display_name=user["display_name"])


@app.get("/api/me", response_model=UserProfile)
async def get_me(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**user)


# --- Coin Economy ---

@app.post("/api/daily-bonus")
async def claim_daily_bonus(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if user.get("last_daily_bonus") == today:
        raise HTTPException(status_code=400, detail="Already claimed today")

    new_coins = await update_coins(payload["user_id"], DAILY_BONUS)
    await update_user(payload["user_id"], {"last_daily_bonus": today})
    return {"coins": new_coins, "bonus": DAILY_BONUS}


@app.post("/api/bailout")
async def claim_bailout(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    if user["coins"] > 0:
        raise HTTPException(status_code=400, detail="You still have coins")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if user.get("last_bailout") == today:
        raise HTTPException(status_code=400, detail="Already bailed out today")

    new_coins = await update_coins(payload["user_id"], BAILOUT_COINS)
    await update_user(payload["user_id"], {"last_bailout": today})
    return {"coins": new_coins, "bailout": BAILOUT_COINS}


# --- Table Routes ---

@app.get("/api/tables", response_model=list[TableInfo])
async def list_tables(token: str = Query(...)):
    _get_current_user(token)
    result = []
    for tid, t in tables.items():
        game: BlackjackGame = t["game"]
        result.append(
            TableInfo(
                table_id=tid,
                name=t["name"],
                player_count=len(game.players),
                max_players=TABLE_MAX_PLAYERS,
                min_bet=t["min_bet"],
                status=game.phase.value,
            )
        )
    return result


@app.post("/api/tables", response_model=TableInfo)
async def create_table(req: CreateTableRequest, token: str = Query(...)):
    payload = _get_current_user(token)
    table_id = str(uuid.uuid4())[:8]
    game = BlackjackGame()
    tables[table_id] = {
        "name": req.name,
        "min_bet": req.min_bet,
        "game": game,
        "creator_id": payload["user_id"],
    }
    return TableInfo(
        table_id=table_id,
        name=req.name,
        player_count=0,
        max_players=TABLE_MAX_PLAYERS,
        min_bet=req.min_bet,
        status=game.phase.value,
    )


# --- Turn Timer ---

async def _turn_timeout(table_id: str, player_id: str):
    await asyncio.sleep(TURN_TIMEOUT_SECONDS)
    if table_id not in tables:
        return
    game: BlackjackGame = tables[table_id]["game"]
    if game.current_player_id == player_id:
        game.auto_stand(player_id)
        await manager.broadcast(table_id, {
            "type": "auto_stand",
            "player_id": player_id,
        })
        await _broadcast_state(table_id)
        _start_turn_timer(table_id)


def _start_turn_timer(table_id: str):
    _cancel_turn_timer(table_id)
    if table_id not in tables:
        return
    game: BlackjackGame = tables[table_id]["game"]
    pid = game.current_player_id
    if pid and game.phase == Phase.PLAYER_TURNS:
        turn_timers[table_id] = asyncio.create_task(_turn_timeout(table_id, pid))


def _cancel_turn_timer(table_id: str):
    timer = turn_timers.pop(table_id, None)
    if timer:
        timer.cancel()


async def _broadcast_state(table_id: str):
    if table_id not in tables:
        return
    game: BlackjackGame = tables[table_id]["game"]
    state = game.get_state(hide_dealer_hole=(game.phase == Phase.PLAYER_TURNS))
    await manager.broadcast(table_id, {"type": "game_state", **state})

    # If resolution, handle payouts
    if game.phase == Phase.RESOLUTION:
        _cancel_turn_timer(table_id)
        for pid in game.players:
            payout = game.calculate_payout(pid)
            if payout != 0:
                try:
                    await update_coins(pid, payout)
                except (ValueError, Exception):
                    pass
            # Update stats
            result = game.results.get(pid)
            if result:
                stat_field = {
                    "win": "wins",
                    "blackjack": "wins",
                    "lose": "losses",
                    "push": "draws",
                }.get(result.value, "draws")
                user = await get_user(pid)
                if user:
                    await update_user(pid, {stat_field: user.get(stat_field, 0) + 1})


# --- WebSocket ---

@app.websocket("/ws/table/{table_id}")
async def websocket_endpoint(websocket: WebSocket, table_id: str, token: str = Query(...)):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001)
        return

    if table_id not in tables:
        await websocket.close(code=4004)
        return

    user_id = payload["user_id"]
    display_name = payload["display_name"]
    game: BlackjackGame = tables[table_id]["game"]

    if len(game.players) >= TABLE_MAX_PLAYERS and user_id not in game.players:
        await websocket.close(code=4002)
        return

    await manager.connect(table_id, user_id, display_name, websocket)

    # Add player to game if not already
    game.add_player(user_id, display_name)

    await manager.broadcast(table_id, {
        "type": "player_joined",
        "player_id": user_id,
        "display_name": display_name,
    })
    await _broadcast_state(table_id)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "start":
                if game.phase == Phase.WAITING:
                    game.start_betting()
                    await _broadcast_state(table_id)

            elif action == "bet":
                amount = data.get("amount", 0)
                min_bet = tables[table_id]["min_bet"]
                if amount < min_bet:
                    await manager.send_to(table_id, user_id, {
                        "type": "error",
                        "message": f"Minimum bet is {min_bet}",
                    })
                    continue

                # Check coins
                user = await get_user(user_id)
                if not user or user["coins"] < amount:
                    await manager.send_to(table_id, user_id, {
                        "type": "error",
                        "message": "Not enough coins",
                    })
                    continue

                if game.place_bet(user_id, amount):
                    await manager.broadcast(table_id, {
                        "type": "bet_placed",
                        "player_id": user_id,
                        "amount": amount,
                    })
                    if game.all_bets_placed():
                        game.deal()
                        await _broadcast_state(table_id)
                        _start_turn_timer(table_id)

            elif action == "hit":
                card = game.hit(user_id)
                if card:
                    _cancel_turn_timer(table_id)
                    await _broadcast_state(table_id)
                    _start_turn_timer(table_id)

            elif action == "stand":
                if game.stand(user_id):
                    _cancel_turn_timer(table_id)
                    await _broadcast_state(table_id)
                    _start_turn_timer(table_id)

            elif action == "double":
                user = await get_user(user_id)
                player = game.players.get(user_id)
                if player and user and user["coins"] >= player.bet * 2:
                    card = game.double_down(user_id)
                    if card:
                        _cancel_turn_timer(table_id)
                        await _broadcast_state(table_id)
                        _start_turn_timer(table_id)
                else:
                    await manager.send_to(table_id, user_id, {
                        "type": "error",
                        "message": "Not enough coins for double down",
                    })

            elif action == "new_round":
                if game.phase == Phase.RESOLUTION:
                    game.reset_for_new_round()
                    await _broadcast_state(table_id)

    except WebSocketDisconnect:
        manager.disconnect(table_id, user_id)
        game.remove_player(user_id)
        await manager.broadcast(table_id, {
            "type": "player_left",
            "player_id": user_id,
            "display_name": display_name,
        })
        if not game.players:
            _cancel_turn_timer(table_id)
            tables.pop(table_id, None)
        else:
            await _broadcast_state(table_id)


# Mount static files for local development
import os
if os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

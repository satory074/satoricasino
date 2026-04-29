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
from backend.game.blackjack import BlackjackGame, Phase as BJPhase
from backend.game.chinchiro import (
    ChinchiroGame,
    HandName as CCHandName,
    Phase as CCPhase,
)
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
# table_id -> { name, min_bet, game, game_type, creator_id }
tables: dict[str, dict] = {}

turn_timers: dict[str, asyncio.Task] = {}
banker_tasks: dict[str, asyncio.Task] = {}


SUPPORTED_GAMES = {"blackjack", "chinchiro"}


def _get_current_user(token: str) -> dict:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def _make_game(game_type: str):
    if game_type == "blackjack":
        return BlackjackGame()
    if game_type == "chinchiro":
        return ChinchiroGame()
    raise ValueError(f"Unsupported game: {game_type}")


def _game_phase_str(table: dict) -> str:
    return table["game"].phase.value


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
        result.append(
            TableInfo(
                table_id=tid,
                name=t["name"],
                player_count=len(t["game"].players),
                max_players=TABLE_MAX_PLAYERS,
                min_bet=t["min_bet"],
                status=_game_phase_str(t),
                game_type=t.get("game_type", "blackjack"),
            )
        )
    return result


@app.post("/api/tables", response_model=TableInfo)
async def create_table(req: CreateTableRequest, token: str = Query(...)):
    payload = _get_current_user(token)
    if req.game_type not in SUPPORTED_GAMES:
        raise HTTPException(status_code=400, detail=f"Unsupported game: {req.game_type}")
    table_id = str(uuid.uuid4())[:8]
    game = _make_game(req.game_type)
    tables[table_id] = {
        "name": req.name,
        "min_bet": req.min_bet,
        "game": game,
        "game_type": req.game_type,
        "creator_id": payload["user_id"],
    }
    return TableInfo(
        table_id=table_id,
        name=req.name,
        player_count=0,
        max_players=TABLE_MAX_PLAYERS,
        min_bet=req.min_bet,
        status=game.phase.value,
        game_type=req.game_type,
    )


# --- Turn timer (blackjack) ---

async def _bj_turn_timeout(table_id: str, player_id: str):
    await asyncio.sleep(TURN_TIMEOUT_SECONDS)
    if table_id not in tables:
        return
    table = tables[table_id]
    if table["game_type"] != "blackjack":
        return
    game: BlackjackGame = table["game"]
    if game.current_player_id == player_id:
        game.auto_stand(player_id)
        await manager.broadcast(table_id, {
            "type": "auto_stand",
            "player_id": player_id,
        })
        await _broadcast_state(table_id)
        _start_bj_turn_timer(table_id)


def _start_bj_turn_timer(table_id: str):
    _cancel_turn_timer(table_id)
    if table_id not in tables:
        return
    table = tables[table_id]
    if table["game_type"] != "blackjack":
        return
    game: BlackjackGame = table["game"]
    pid = game.current_player_id
    if pid and game.phase == BJPhase.PLAYER_TURNS:
        turn_timers[table_id] = asyncio.create_task(_bj_turn_timeout(table_id, pid))


# --- Turn timer (chinchiro) ---

async def _cc_turn_timeout(table_id: str, player_id: str):
    await asyncio.sleep(TURN_TIMEOUT_SECONDS)
    if table_id not in tables:
        return
    table = tables[table_id]
    if table["game_type"] != "chinchiro":
        return
    game: ChinchiroGame = table["game"]
    if game.current_player_id == player_id:
        game.auto_settle(player_id)
        await manager.broadcast(table_id, {
            "type": "auto_stand",
            "player_id": player_id,
        })
        await _broadcast_state(table_id)
        _start_cc_turn_timer(table_id)


def _start_cc_turn_timer(table_id: str):
    _cancel_turn_timer(table_id)
    if table_id not in tables:
        return
    table = tables[table_id]
    if table["game_type"] != "chinchiro":
        return
    game: ChinchiroGame = table["game"]
    pid = game.current_player_id
    if pid and game.phase == CCPhase.PLAYER_ROLLS:
        turn_timers[table_id] = asyncio.create_task(_cc_turn_timeout(table_id, pid))


def _cancel_turn_timer(table_id: str):
    timer = turn_timers.pop(table_id, None)
    if timer:
        timer.cancel()


def _cancel_banker_task(table_id: str):
    task = banker_tasks.pop(table_id, None)
    if task:
        task.cancel()


# --- Broadcast ---

async def _broadcast_state(table_id: str):
    if table_id not in tables:
        return
    table = tables[table_id]
    game_type = table["game_type"]
    if game_type == "blackjack":
        await _broadcast_blackjack(table_id, table)
    elif game_type == "chinchiro":
        await _broadcast_chinchiro(table_id, table)


async def _broadcast_blackjack(table_id: str, table: dict):
    game: BlackjackGame = table["game"]
    state = game.get_state(hide_dealer_hole=(game.phase == BJPhase.PLAYER_TURNS))
    await manager.broadcast(
        table_id,
        {"type": "game_state", "game_type": "blackjack", **state},
    )

    if game.phase == BJPhase.RESOLUTION:
        _cancel_turn_timer(table_id)
        for pid in game.players:
            payout = game.calculate_payout(pid)
            if payout != 0:
                try:
                    await update_coins(pid, payout)
                except (ValueError, Exception):
                    pass
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


async def _broadcast_chinchiro(table_id: str, table: dict):
    game: ChinchiroGame = table["game"]
    state = game.get_state()
    await manager.broadcast(
        table_id,
        {"type": "game_state", "game_type": "chinchiro", **state},
    )

    if game.phase == CCPhase.RESOLUTION:
        _cancel_turn_timer(table_id)
        for pid in game.players:
            payout = game.calculate_payout_for(pid)
            if payout != 0:
                try:
                    await update_coins(pid, payout)
                except (ValueError, Exception):
                    pass
            stat_field = (
                "wins" if payout > 0 else "losses" if payout < 0 else "draws"
            )
            user = await get_user(pid)
            if user:
                await update_user(pid, {stat_field: user.get(stat_field, 0) + 1})


# --- Chinchiro banker sequence ---

async def _chinchiro_banker_sequence(table_id: str):
    """Roll banker dice one at a time with broadcasts in between for dramatic pacing."""
    if table_id not in tables:
        return
    table = tables[table_id]
    game: ChinchiroGame = table["game"]

    game.begin_banker()
    await _broadcast_state(table_id)
    await asyncio.sleep(0.4)

    # Roll dice one at a time so the frontend can animate each
    while game.banker_hand is None and len(game.banker_rolls) < 3:
        try:
            game.banker_step()
        except Exception:
            return
        await _broadcast_state(table_id)
        if game.banker_hand is None:
            await asyncio.sleep(1.0)  # pause between non-settling rolls

    # Hold on the final hand reveal so the SFX/overlay can land
    await asyncio.sleep(1.6)

    if table_id not in tables:
        return
    if game.banker_special_resolves():
        game.resolve()
    else:
        game.begin_player_rolls()
    await _broadcast_state(table_id)
    if game.phase == CCPhase.PLAYER_ROLLS:
        _start_cc_turn_timer(table_id)


# --- WebSocket dispatch ---

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
    table = tables[table_id]
    game = table["game"]

    if len(game.players) >= TABLE_MAX_PLAYERS and user_id not in game.players:
        await websocket.close(code=4002)
        return

    await manager.connect(table_id, user_id, display_name, websocket)
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
            if table["game_type"] == "blackjack":
                await _handle_blackjack_action(table_id, user_id, action, data)
            elif table["game_type"] == "chinchiro":
                await _handle_chinchiro_action(table_id, user_id, action, data)

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
            _cancel_banker_task(table_id)
            tables.pop(table_id, None)
        else:
            await _broadcast_state(table_id)


# --- Action handlers ---

async def _handle_blackjack_action(table_id: str, user_id: str, action: str, data: dict):
    table = tables[table_id]
    game: BlackjackGame = table["game"]

    if action == "start":
        if game.phase == BJPhase.WAITING:
            game.start_betting()
            await _broadcast_state(table_id)

    elif action == "bet":
        amount = data.get("amount", 0)
        min_bet = table["min_bet"]
        if amount < min_bet:
            await manager.send_to(table_id, user_id, {
                "type": "error",
                "message": f"Minimum bet is {min_bet}",
            })
            return

        user = await get_user(user_id)
        if not user or user["coins"] < amount:
            await manager.send_to(table_id, user_id, {
                "type": "error",
                "message": "Not enough coins",
            })
            return

        if game.place_bet(user_id, amount):
            await manager.broadcast(table_id, {
                "type": "bet_placed",
                "player_id": user_id,
                "amount": amount,
            })
            if game.all_bets_placed():
                game.deal()
                await _broadcast_state(table_id)
                _start_bj_turn_timer(table_id)

    elif action == "hit":
        card = game.hit(user_id)
        if card:
            _cancel_turn_timer(table_id)
            await _broadcast_state(table_id)
            _start_bj_turn_timer(table_id)

    elif action == "stand":
        if game.stand(user_id):
            _cancel_turn_timer(table_id)
            await _broadcast_state(table_id)
            _start_bj_turn_timer(table_id)

    elif action == "double":
        user = await get_user(user_id)
        player = game.players.get(user_id)
        if player and user and user["coins"] >= player.bet * 2:
            card = game.double_down(user_id)
            if card:
                _cancel_turn_timer(table_id)
                await _broadcast_state(table_id)
                _start_bj_turn_timer(table_id)
        else:
            await manager.send_to(table_id, user_id, {
                "type": "error",
                "message": "Not enough coins for double down",
            })

    elif action == "new_round":
        if game.phase == BJPhase.RESOLUTION:
            game.reset_for_new_round()
            await _broadcast_state(table_id)


async def _handle_chinchiro_action(table_id: str, user_id: str, action: str, data: dict):
    table = tables[table_id]
    game: ChinchiroGame = table["game"]

    if action == "start":
        if game.phase == CCPhase.WAITING:
            game.start_betting()
            await _broadcast_state(table_id)

    elif action == "bet":
        amount = data.get("amount", 0)
        min_bet = table["min_bet"]
        if amount < min_bet:
            await manager.send_to(table_id, user_id, {
                "type": "error",
                "message": f"Minimum bet is {min_bet}",
            })
            return

        user = await get_user(user_id)
        # Pinzoro pays 5x — make sure the player has enough to cover a 5x loss too.
        # Actually the bet itself is the wager; pinzoro on banker's side takes 5x. Require 5x available.
        if not user or user["coins"] < amount * 5:
            await manager.send_to(table_id, user_id, {
                "type": "error",
                "message": "Need 5x bet in reserve (banker pinzoro can take 5x)",
            })
            return

        if game.place_bet(user_id, amount):
            await manager.broadcast(table_id, {
                "type": "bet_placed",
                "player_id": user_id,
                "amount": amount,
            })
            if game.all_bets_placed():
                # Kick off banker sequence as background task so the WS loop stays responsive
                _cancel_banker_task(table_id)
                banker_tasks[table_id] = asyncio.create_task(
                    _chinchiro_banker_sequence(table_id)
                )

    elif action == "roll":
        result = game.roll_player(user_id)
        if result is not None:
            if game.phase != CCPhase.PLAYER_ROLLS:
                _cancel_turn_timer(table_id)
            await _broadcast_state(table_id)
            if game.phase == CCPhase.PLAYER_ROLLS:
                _start_cc_turn_timer(table_id)

    elif action == "new_round":
        if game.phase == CCPhase.RESOLUTION:
            game.reset_for_new_round()
            await _broadcast_state(table_id)


# Mount static files for local development
import os
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
elif os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

from __future__ import annotations

import asyncio
import random
import uuid
from contextlib import asynccontextmanager
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
    LoginRequest,
    RegisterRequest,
    TableInfo,
    TokenResponse,
    UserProfile,
)
from backend.websocket_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Populate every empty seeded table with a single bot so the floor never
    # looks dead. Bots step out as soon as a human connects (see WS endpoint).
    for table_id in list(tables.keys()):
        await _spawn_bot(table_id)
    yield
    for task in list(bot_drivers.values()):
        task.cancel()


app = FastAPI(title="SatoriCasino", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory table storage
# table_id -> { name, min_bet, game, game_type }
tables: dict[str, dict] = {}

turn_timers: dict[str, asyncio.Task] = {}
banker_tasks: dict[str, asyncio.Task] = {}


SUPPORTED_GAMES = {"blackjack", "chinchiro"}

# Fixed tables, seeded once at module load. The casino owns these — players join, never create.
# Stable IDs survive Cloud Run cold starts (the in-memory game state is rebuilt on restart, but the
# table identity stays the same so the lobby URL/links don't break).
SEED_TABLES: list[dict] = [
    {"id": "bj-low",  "name": "Blackjack — Low Limit",   "game_type": "blackjack", "min_bet": 10},
    {"id": "bj-mid",  "name": "Blackjack — Mid Stakes",  "game_type": "blackjack", "min_bet": 100},
    {"id": "bj-high", "name": "Blackjack — High Roller", "game_type": "blackjack", "min_bet": 1000},
    {"id": "cc-low",  "name": "チンチロ — Low Limit",   "game_type": "chinchiro", "min_bet": 10},
    {"id": "cc-mid",  "name": "チンチロ — Mid Stakes",  "game_type": "chinchiro", "min_bet": 100},
    {"id": "cc-high", "name": "チンチロ — High Roller", "game_type": "chinchiro", "min_bet": 1000},
]


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


def _seed_tables() -> None:
    for spec in SEED_TABLES:
        tables[spec["id"]] = {
            "name": spec["name"],
            "min_bet": spec["min_bet"],
            "game": _make_game(spec["game_type"]),
            "game_type": spec["game_type"],
        }


_seed_tables()


# --- AI bots ---
# A bot fills a table when there are zero humans on it; it steps out as soon as
# any human connects. Bots have synthetic IDs (no Firestore record) so payout
# and stats writes skip them. Behaviour is intentionally simple and predictable
# (Blackjack: hit < 17, stand otherwise; Chinchiro: roll until settled), bets
# match the table's min_bet, and each action is paced ~1.5–2.5s for a human feel.

BOT_ID_PREFIX = "bot-"
BOT_NAMES = ["Alice", "Bob", "Carol", "Diego", "Emma", "Felix", "Gina", "Hugo"]
bot_drivers: dict[str, asyncio.Task] = {}


def _is_bot(pid: str) -> bool:
    return pid.startswith(BOT_ID_PREFIX)


def _human_count(game) -> int:
    return sum(1 for pid in game.players if not _is_bot(pid))


def _make_bot_id() -> str:
    return f"{BOT_ID_PREFIX}{uuid.uuid4().hex[:6]}"


async def _spawn_bot(table_id: str) -> None:
    if table_id not in tables:
        return
    table = tables[table_id]
    game = table["game"]
    if any(_is_bot(pid) for pid in game.players):
        return
    if _human_count(game) > 0:
        return
    # Mid-round leftover state would block add_player; rebuild the game so the
    # bot starts cleanly in WAITING.
    if game.phase.value not in ("waiting", "betting"):
        _cancel_turn_timer(table_id)
        _cancel_banker_task(table_id)
        table["game"] = _make_game(table["game_type"])
        game = table["game"]
    bot_id = _make_bot_id()
    bot_name = f"🤖 Bot {random.choice(BOT_NAMES)}"
    if not game.add_player(bot_id, bot_name):
        return
    await manager.broadcast(table_id, {
        "type": "player_joined",
        "player_id": bot_id,
        "display_name": bot_name,
    })
    await _broadcast_state(table_id)
    bot_drivers[table_id] = asyncio.create_task(_run_bot_driver(table_id, bot_id))


async def _despawn_bots(table_id: str) -> None:
    if table_id not in tables:
        return
    table = tables[table_id]

    task = bot_drivers.pop(table_id, None)
    if task and not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    game = table["game"]
    bots_info = [(pid, p.display_name) for pid, p in game.players.items() if _is_bot(pid)]
    if not bots_info:
        return

    # Throw out any partial round state so the human starts fresh.
    _cancel_turn_timer(table_id)
    _cancel_banker_task(table_id)
    table["game"] = _make_game(table["game_type"])

    for bot_id, display_name in bots_info:
        await manager.broadcast(table_id, {
            "type": "player_left",
            "player_id": bot_id,
            "display_name": display_name,
        })
    await _broadcast_state(table_id)


async def _run_bot_driver(table_id: str, bot_id: str) -> None:
    try:
        while True:
            await asyncio.sleep(1.0)
            if table_id not in tables:
                return
            table = tables[table_id]
            game = table["game"]
            if bot_id not in game.players:
                return
            if _human_count(game) > 0:
                # Despawn handler is responsible for cleanup; just exit.
                return

            if table["game_type"] == "blackjack":
                await _bot_step_blackjack(table_id, bot_id)
            elif table["game_type"] == "chinchiro":
                await _bot_step_chinchiro(table_id, bot_id)
    except asyncio.CancelledError:
        return
    except Exception as exc:  # pragma: no cover — defensive
        print(f"[bot] driver crashed for table={table_id} bot={bot_id}: {exc!r}")


async def _bot_step_blackjack(table_id: str, bot_id: str) -> None:
    table = tables[table_id]
    game: BlackjackGame = table["game"]

    if game.phase == BJPhase.WAITING:
        await asyncio.sleep(1.5)
        if game.phase == BJPhase.WAITING and bot_id in game.players:
            game.start_betting()
            await _broadcast_state(table_id)
        return

    if game.phase == BJPhase.BETTING:
        bot = game.players.get(bot_id)
        if bot and bot.bet == 0:
            await asyncio.sleep(1.5)
            if game.phase != BJPhase.BETTING or bot_id not in game.players:
                return
            game.place_bet(bot_id, table["min_bet"])
            await manager.broadcast(table_id, {
                "type": "bet_placed",
                "player_id": bot_id,
                "amount": table["min_bet"],
            })
            if game.all_bets_placed():
                game.deal()
                await _broadcast_state(table_id)
                _start_bj_turn_timer(table_id)
            else:
                await _broadcast_state(table_id)
        return

    if game.phase == BJPhase.PLAYER_TURNS and game.current_player_id == bot_id:
        await asyncio.sleep(1.5)
        if game.phase != BJPhase.PLAYER_TURNS or game.current_player_id != bot_id:
            return
        bot = game.players[bot_id]
        if bot.value < 17:
            game.hit(bot_id)
        else:
            game.stand(bot_id)
        _cancel_turn_timer(table_id)
        await _broadcast_state(table_id)
        _start_bj_turn_timer(table_id)
        return

    if game.phase == BJPhase.RESOLUTION:
        await asyncio.sleep(2.5)
        if game.phase == BJPhase.RESOLUTION and bot_id in game.players:
            game.reset_for_new_round()
            await _broadcast_state(table_id)


async def _bot_step_chinchiro(table_id: str, bot_id: str) -> None:
    table = tables[table_id]
    game: ChinchiroGame = table["game"]

    if game.phase == CCPhase.WAITING:
        await asyncio.sleep(1.5)
        if game.phase == CCPhase.WAITING and bot_id in game.players:
            game.start_betting()
            await _broadcast_state(table_id)
        return

    if game.phase == CCPhase.BETTING:
        bot = game.players.get(bot_id)
        if bot and bot.bet == 0:
            await asyncio.sleep(1.5)
            if game.phase != CCPhase.BETTING or bot_id not in game.players:
                return
            game.place_bet(bot_id, table["min_bet"])
            await manager.broadcast(table_id, {
                "type": "bet_placed",
                "player_id": bot_id,
                "amount": table["min_bet"],
            })
            if game.all_bets_placed():
                _cancel_banker_task(table_id)
                banker_tasks[table_id] = asyncio.create_task(
                    _chinchiro_banker_sequence(table_id)
                )
            else:
                await _broadcast_state(table_id)
        return

    if game.phase == CCPhase.PLAYER_ROLLS and game.current_player_id == bot_id:
        await asyncio.sleep(1.5)
        if game.phase != CCPhase.PLAYER_ROLLS or game.current_player_id != bot_id:
            return
        game.roll_player(bot_id)
        if game.phase != CCPhase.PLAYER_ROLLS:
            _cancel_turn_timer(table_id)
        await _broadcast_state(table_id)
        if game.phase == CCPhase.PLAYER_ROLLS:
            _start_cc_turn_timer(table_id)
        return

    if game.phase == CCPhase.RESOLUTION:
        await asyncio.sleep(2.5)
        if game.phase == CCPhase.RESOLUTION and bot_id in game.players:
            game.reset_for_new_round()
            await _broadcast_state(table_id)


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
            if _is_bot(pid):
                continue
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
            if _is_bot(pid):
                continue
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

    # Bot leaves the moment a real human arrives — they never share a round.
    await _despawn_bots(table_id)

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
        if _human_count(game) == 0:
            _cancel_turn_timer(table_id)
            _cancel_banker_task(table_id)
            # Fixed tables persist; just rebuild a fresh game instance and
            # invite a bot back so the table doesn't sit empty.
            table["game"] = _make_game(table["game_type"])
            await _spawn_bot(table_id)
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

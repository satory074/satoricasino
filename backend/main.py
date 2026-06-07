from __future__ import annotations

import asyncio
import collections
import random
import time as _time_mod
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.auth import create_token, decode_token
from backend.config import (
    AD_REWARD_COINS,
    AD_REWARD_DAILY_CAP,
    AD_WATCH_MIN_SECONDS,
    BAILOUT_COINS,
    BAILOUT_COINS_AD,
    DAILY_BONUS,
    PASSPHRASE,
    TABLE_MAX_PLAYERS,
    TURN_TIMEOUT_SECONDS,
    XP_ACHIEVEMENT,
    XP_DAILY,
    XP_JACKPOT,
    XP_ROUND,
    XP_WIN,
)
from backend.database import (
    add_xp,
    create_user,
    get_leaderboard,
    get_user,
    get_user_by_name,
    get_user_rank,
    unlock_achievements,
    update_coins,
    update_game_stats,
    update_streaks,
    update_user,
)
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
from backend.achievements import check_achievements, get_all_achievements_with_progress
from backend.challenges import get_challenge_by_id, get_daily_challenges, init_daily_baselines
from backend.cosmetics import ACHIEVEMENT_COSMETICS, COSMETICS, get_catalog, validate_equip, validate_purchase
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
dealer_tasks: dict[str, asyncio.Task] = {}

# In-memory ad sessions (60s TTL, wiped on restart — fine for ephemeral data)
import time as _time

ad_sessions: dict[str, dict] = {}


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
        raise HTTPException(status_code=401, detail={"code": "auth.invalid_token"})
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
            # Jackpot timestamps (monotonic seconds) for "hot table" social signal.
            # Bounded so even a busy table doesn't grow unbounded between cold starts.
            "recent_jackpots": collections.deque(maxlen=20),
        }


_seed_tables()


# How long a jackpot stays "fresh" enough to count toward table heat (seconds).
TABLE_HEAT_WINDOW_SEC = 300


def _table_heat(table: dict) -> dict:
    """Compute current table heat from the rolling jackpot timestamp window."""
    dq = table.get("recent_jackpots")
    if not dq:
        return {"jackpots5min": 0, "hot": False, "ultra_hot": False}
    now = _time_mod.time()
    fresh = sum(1 for ts in dq if now - ts <= TABLE_HEAT_WINDOW_SEC)
    return {
        "jackpots5min": fresh,
        "hot": fresh >= 2,
        "ultra_hot": fresh >= 5,
    }


def _record_jackpot(table: dict) -> None:
    dq = table.get("recent_jackpots")
    if dq is not None:
        dq.append(_time_mod.time())


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
        _cancel_dealer_task(table_id)
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
                if game.phase == BJPhase.DEALER_TURN:
                    _schedule_dealer_sequence(table_id)
                else:
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
        if game.phase == BJPhase.DEALER_TURN:
            _schedule_dealer_sequence(table_id)
        else:
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
        raise HTTPException(status_code=403, detail={"code": "auth.wrong_passphrase"})
    if not req.display_name.strip():
        raise HTTPException(status_code=400, detail={"code": "auth.display_name_required"})

    existing = await get_user_by_name(req.display_name)
    if existing:
        raise HTTPException(status_code=409, detail={"code": "auth.name_taken"})

    user = await create_user(req.display_name.strip())
    token = create_token(user["user_id"], user["display_name"])
    return TokenResponse(token=token, user_id=user["user_id"], display_name=user["display_name"])


@app.post("/api/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    if req.passphrase != PASSPHRASE:
        raise HTTPException(status_code=403, detail={"code": "auth.wrong_passphrase"})

    user = await get_user_by_name(req.display_name)
    if not user:
        raise HTTPException(status_code=404, detail={"code": "user.not_found"})

    token = create_token(user["user_id"], user["display_name"])
    return TokenResponse(token=token, user_id=user["user_id"], display_name=user["display_name"])


@app.get("/api/me", response_model=UserProfile)
async def get_me(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail={"code": "user.not_found"})
    return UserProfile(**user)


# --- Coin Economy ---

def compute_daily_streak(last_bonus: str | None, today: str, old_streak: int) -> int:
    """Next login-streak day given the last claim date.

    One-day grace: claiming the day after (gap 1) or after skipping a single
    day (gap 2) both continue the streak. A larger gap resets to day 1. This
    softens streak-loss FOMO — missing one day no longer wipes progress.
    Caller must have already rejected a same-day re-claim (gap 0).
    """
    gap = 999
    if last_bonus:
        try:
            last_dt = datetime.strptime(last_bonus, "%Y-%m-%d")
            today_dt = datetime.strptime(today, "%Y-%m-%d")
            gap = (today_dt - last_dt).days
        except ValueError:
            gap = 999
    if 1 <= gap <= 2:
        return min(old_streak + 1, 7)
    return 1


@app.post("/api/daily-bonus")
async def claim_daily_bonus(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if user.get("last_daily_bonus") == today:
        raise HTTPException(status_code=400, detail={"code": "daily_bonus.already_claimed"})

    # Login streak: consecutive days → escalating bonus, with a one-day grace
    # so a single missed day doesn't wipe progress (avoids streak-loss FOMO).
    old_streak = user.get("daily_streak", 0)
    new_streak = compute_daily_streak(user.get("last_daily_bonus"), today, old_streak)

    bonus = 100 + (new_streak - 1) * 50  # Day1=100, Day7=400 (next day wraps to 1)
    if new_streak >= 7:
        bonus = 500
        # Reset after day 7 so next claim starts at day 1
        new_streak_save = 0
    else:
        new_streak_save = new_streak

    new_coins = await update_coins(payload["user_id"], bonus)
    await update_user(payload["user_id"], {
        "last_daily_bonus": today,
        "daily_streak": new_streak_save,
    })
    try:
        await add_xp(payload["user_id"], XP_DAILY)
    except Exception:
        pass
    today_ad = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ad_watches = user.get("ad_watches_today", 0) if user.get("last_ad_date") == today_ad else 0
    can_watch_ad = ad_watches < AD_REWARD_DAILY_CAP
    return {
        "coins": new_coins,
        "bonus": bonus,
        "daily_streak": new_streak,
        "daily_streak_max": 7,
        "can_watch_ad": can_watch_ad,
    }


@app.post("/api/bailout")
async def claim_bailout(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    if user["coins"] > 0:
        raise HTTPException(status_code=400, detail={"code": "bailout.has_coins"})

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if user.get("last_bailout") == today:
        raise HTTPException(status_code=400, detail={"code": "bailout.already_today"})

    new_coins = await update_coins(payload["user_id"], BAILOUT_COINS)
    await update_user(payload["user_id"], {"last_bailout": today})
    ad_watches = user.get("ad_watches_today", 0) if user.get("last_ad_date") == today else 0
    can_watch_ad = ad_watches < AD_REWARD_DAILY_CAP
    return {"coins": new_coins, "bailout": BAILOUT_COINS, "can_watch_ad": can_watch_ad}


# --- Reward Ads ---

def _cleanup_expired_ad_sessions():
    now = _time.time()
    expired = [k for k, v in ad_sessions.items() if now - v["started_at"] > 60]
    for k in expired:
        del ad_sessions[k]


@app.post("/api/ad/start")
async def ad_start(token: str = Query(...), purpose: str = Query(...), bonus_amount: int = Query(0)):
    payload = _get_current_user(token)
    if purpose not in ("daily_bonus_double", "bailout_upgrade", "reward_ad"):
        raise HTTPException(status_code=400, detail={"code": "ad.invalid_purpose"})

    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ad_watches = user.get("ad_watches_today", 0) if user.get("last_ad_date") == today else 0
    if ad_watches >= AD_REWARD_DAILY_CAP:
        raise HTTPException(status_code=400, detail={"code": "ad.daily_cap"})

    _cleanup_expired_ad_sessions()
    session_id = str(uuid.uuid4())
    ad_sessions[session_id] = {
        "user_id": payload["user_id"],
        "started_at": _time.time(),
        "purpose": purpose,
        "bonus_amount": bonus_amount,
    }
    return {"ad_session_id": session_id}


@app.post("/api/ad/complete")
async def ad_complete(token: str = Query(...), ad_session_id: str = Query(...)):
    payload = _get_current_user(token)

    _cleanup_expired_ad_sessions()
    session = ad_sessions.pop(ad_session_id, None)
    if not session:
        raise HTTPException(status_code=400, detail={"code": "ad.invalid_session"})
    if session["user_id"] != payload["user_id"]:
        raise HTTPException(status_code=403, detail={"code": "ad.session_mismatch"})

    elapsed = _time.time() - session["started_at"]
    if elapsed < AD_WATCH_MIN_SECONDS:
        raise HTTPException(status_code=400, detail={"code": "ad.too_short"})

    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ad_watches = user.get("ad_watches_today", 0) if user.get("last_ad_date") == today else 0
    if ad_watches >= AD_REWARD_DAILY_CAP:
        raise HTTPException(status_code=400, detail={"code": "ad.daily_cap"})

    purpose = session["purpose"]
    bonus_amount = session["bonus_amount"]
    if purpose == "daily_bonus_double":
        reward = bonus_amount
    elif purpose == "bailout_upgrade":
        reward = BAILOUT_COINS_AD - BAILOUT_COINS
    elif purpose == "reward_ad":
        reward = AD_REWARD_COINS
    else:
        reward = 0

    new_coins = await update_coins(payload["user_id"], reward)
    await update_user(payload["user_id"], {
        "ad_watches_today": ad_watches + 1,
        "last_ad_date": today,
    })
    try:
        await add_xp(payload["user_id"], XP_DAILY)
    except Exception:
        pass
    return {"coins": new_coins, "reward": reward, "ad_watches_today": ad_watches + 1}


# --- Leaderboard ---

@app.get("/api/leaderboard")
async def leaderboard(
    token: str = Query(...),
    metric: str = Query("coins"),
    limit: int = Query(10, ge=1, le=50),
):
    payload = _get_current_user(token)
    if metric not in ("coins", "wins"):
        raise HTTPException(status_code=400, detail={"code": "leaderboard.invalid_metric"})
    entries = await get_leaderboard(metric, limit)
    rank = await get_user_rank(payload["user_id"], metric)
    return {"entries": entries, "my_rank": rank}


# --- Player profile (public) ---

@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str, token: str = Query(...)):
    _get_current_user(token)
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail={"code": "user.not_found"})
    # Public info only — no coins
    return {
        "user_id": user.get("user_id"),
        "display_name": user.get("display_name"),
        "wins": user.get("wins", 0),
        "losses": user.get("losses", 0),
        "draws": user.get("draws", 0),
        "level": user.get("level", 1),
        "xp": user.get("xp", 0),
        "game_stats": user.get("game_stats", {}),
        "best_streaks": user.get("best_streaks", {}),
        "unlocked_achievements": list(user.get("unlocked_achievements", {}).keys()),
    }


# --- Achievements ---

@app.get("/api/achievements")
async def get_achievements(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)
    return get_all_achievements_with_progress(user)


# --- Challenges ---

@app.get("/api/challenges")
async def get_challenges(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    # Initialize baselines for today if not set
    ch_data = user.get("challenges", {}).get("daily", {})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if ch_data.get("date") != today:
        baselines = init_daily_baselines(payload["user_id"], user)
        await update_user(payload["user_id"], {"challenges.daily": baselines})
        user = await get_user(payload["user_id"])

    return get_daily_challenges(payload["user_id"], user or {})


@app.post("/api/challenges/{challenge_id}/claim")
async def claim_challenge(challenge_id: str, token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    ch = get_challenge_by_id(payload["user_id"], challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail={"code": "challenge.not_found"})

    # Check completion
    ch_data = user.get("challenges", {}).get("daily", {})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if ch_data.get("date") != today:
        raise HTTPException(status_code=400, detail={"code": "challenge.not_initialized"})

    baselines = ch_data.get("baselines", {})
    claimed = ch_data.get("claimed", [])
    if challenge_id in claimed:
        raise HTTPException(status_code=400, detail={"code": "challenge.already_claimed"})

    current = ch["check"](user)
    baseline = baselines.get(challenge_id, current)
    progress = current - baseline
    if progress < ch["target"]:
        raise HTTPException(status_code=400, detail={"code": "challenge.not_completed"})

    # Award and mark claimed
    new_coins = await update_coins(payload["user_id"], ch["reward"])
    claimed.append(challenge_id)
    await update_user(payload["user_id"], {"challenges.daily.claimed": claimed})
    return {"coins": new_coins, "reward": ch["reward"]}


# --- Cosmetics Shop ---

# Module-level cache for player cosmetics (loaded on WS connect, updated on equip)
player_cosmetics: dict[str, dict] = {}


@app.get("/api/shop")
async def get_shop(token: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)
    owned = user.get("owned_cosmetics", {})
    equipped = user.get("equipped", {})
    unlocked = user.get("unlocked_achievements", {})
    catalog = get_catalog()
    for item in catalog:
        ach = item.get("achievement")
        if ach:
            item["owned"] = ach in unlocked
        else:
            item["owned"] = item["id"] in owned
        item["equipped"] = equipped.get(item["category"]) == item["id"]
    return {"items": catalog, "equipped": equipped, "coins": user.get("coins", 0)}


@app.post("/api/shop/buy")
async def shop_buy(token: str = Query(...), item_id: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    error = validate_purchase(item_id, user)
    if error:
        raise HTTPException(status_code=400, detail={"code": error})

    price = COSMETICS[item_id]["price"]
    new_coins = await update_coins(payload["user_id"], -price)
    now_str = datetime.now(timezone.utc).isoformat()
    await update_user(payload["user_id"], {f"owned_cosmetics.{item_id}": now_str})
    return {"coins": new_coins, "item_id": item_id}


@app.post("/api/shop/equip")
async def shop_equip(token: str = Query(...), item_id: str | None = Query(None), category: str = Query(...)):
    payload = _get_current_user(token)
    user = await get_user(payload["user_id"])
    if not user:
        raise HTTPException(status_code=404)

    error = validate_equip(item_id, category, user)
    if error:
        raise HTTPException(status_code=400, detail={"code": error})

    if item_id is None:
        # Unequip
        equipped = user.get("equipped", {})
        equipped.pop(category, None)
        await update_user(payload["user_id"], {"equipped": equipped})
    else:
        await update_user(payload["user_id"], {f"equipped.{category}": item_id})

    # Update in-memory cosmetics cache
    updated_user = await get_user(payload["user_id"])
    if updated_user:
        player_cosmetics[payload["user_id"]] = updated_user.get("equipped", {})

    return {"equipped": (await get_user(payload["user_id"]) or {}).get("equipped", {})}


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
        if game.phase == BJPhase.DEALER_TURN:
            # Auto-stand pushed us into the dealer turn — let the paced
            # sequence drive the rest of the broadcasts.
            _schedule_dealer_sequence(table_id)
        else:
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


def _cancel_dealer_task(table_id: str):
    task = dealer_tasks.pop(table_id, None)
    if task:
        task.cancel()


def _schedule_dealer_sequence(table_id: str):
    """Kick off (or restart) the paced dealer reveal for a blackjack table."""
    _cancel_dealer_task(table_id)
    dealer_tasks[table_id] = asyncio.create_task(_blackjack_dealer_sequence(table_id))


async def _post_round_xp_and_achievements(
    table_id: str, player_id: str, payout: int, is_jackpot: bool
) -> None:
    """Award XP and check achievements after a round resolves."""
    xp = XP_ROUND
    if payout > 0:
        xp += XP_WIN
    if is_jackpot:
        xp += XP_JACKPOT

    try:
        xp_result = await add_xp(player_id, xp)
        if xp_result["leveled_up"]:
            await manager.send_to(table_id, player_id, {
                "type": "level_up",
                "level": xp_result["level"],
                "xp": xp_result["xp"],
            })
    except Exception:
        pass

    try:
        user = await get_user(player_id)
        if user:
            newly = check_achievements(user)
            if newly:
                await unlock_achievements(player_id, newly)
                ach_xp = XP_ACHIEVEMENT * len(newly)
                await add_xp(player_id, ach_xp)
                for aid in newly:
                    await manager.send_to(table_id, player_id, {
                        "type": "achievement_unlocked",
                        "achievement_id": aid,
                    })
                    # Auto-grant achievement cosmetic if one is linked
                    if aid in ACHIEVEMENT_COSMETICS:
                        cos_id = ACHIEVEMENT_COSMETICS[aid]
                        now_str = datetime.now(timezone.utc).isoformat()
                        await update_user(player_id, {f"owned_cosmetics.{cos_id}": now_str})
    except Exception:
        pass


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
    # Inject equipped cosmetics per player
    for pid in state.get("players", {}):
        equipped = player_cosmetics.get(pid, {})
        if equipped:
            state["players"][pid]["equipped"] = equipped
    state["table_heat"] = _table_heat(table)
    await manager.broadcast(
        table_id,
        {"type": "game_state", "game_type": "blackjack", **state},
    )

    if game.phase == BJPhase.RESOLUTION:
        _cancel_turn_timer(table_id)
        # Track jackpot occurrences for the table-heat social signal — bots count
        # too so a fresh-spawned table doesn't look ice-cold the moment a human joins.
        for pid, p in game.players.items():
            r = game.results.get(pid)
            if r is not None and r.value == "blackjack":
                _record_jackpot(table)
                break
        for pid in game.players:
            if _is_bot(pid):
                continue
            payout = game.calculate_payout(pid)
            bet = game.players[pid].bet
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
            try:
                await update_game_stats(pid, "blackjack", payout, bet)
                await update_streaks(pid, "blackjack", payout)
            except Exception:
                pass
            is_jackpot = result is not None and result.value == "blackjack"
            await _post_round_xp_and_achievements(table_id, pid, payout, is_jackpot)


async def _broadcast_chinchiro(table_id: str, table: dict):
    game: ChinchiroGame = table["game"]
    state = game.get_state()
    # Inject equipped cosmetics per player
    for pid in state.get("players", {}):
        equipped = player_cosmetics.get(pid, {})
        if equipped:
            state["players"][pid]["equipped"] = equipped
    state["table_heat"] = _table_heat(table)
    await manager.broadcast(
        table_id,
        {"type": "game_state", "game_type": "chinchiro", **state},
    )

    if game.phase == CCPhase.RESOLUTION:
        _cancel_turn_timer(table_id)
        # Heat: count any pinzoro (banker or player) as a jackpot occurrence
        if game.banker_hand and game.banker_hand.name == CCHandName.PINZORO.value:
            _record_jackpot(table)
        else:
            for p in game.players.values():
                if p.hand is not None and p.hand.name == CCHandName.PINZORO.value:
                    _record_jackpot(table)
                    break
        for pid in game.players:
            if _is_bot(pid):
                continue
            payout = game.calculate_payout_for(pid)
            bet = game.players[pid].bet
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
            try:
                await update_game_stats(pid, "chinchiro", payout, bet)
                await update_streaks(pid, "chinchiro", payout)
            except Exception:
                pass
            # Pinzoro on player side is a jackpot
            player = game.players.get(pid)
            is_jackpot = (
                player is not None
                and player.hand is not None
                and player.hand.name == CCHandName.PINZORO.value
            )
            await _post_round_xp_and_achievements(table_id, pid, payout, is_jackpot)


# --- Chinchiro banker sequence ---

async def _blackjack_dealer_sequence(table_id: str):
    """Walk the dealer turn one card at a time so the client can animate each flip.

    Mirrors `_chinchiro_banker_sequence`. Phase is already DEALER_TURN when this
    starts (set by `_advance_player`/`_skip_done_players`/dealer-BJ short-circuit).
    """
    if table_id not in tables:
        return
    table = tables[table_id]
    if table["game_type"] != "blackjack":
        return
    game: BlackjackGame = table["game"]

    # First broadcast: hole card now revealed (get_state stops hiding it once
    # phase != PLAYER_TURNS). Hold for the heartbeat/peek beat.
    await _broadcast_state(table_id)
    await asyncio.sleep(0.7)

    # Pace each dealer hit individually.
    while True:
        if table_id not in tables:
            return
        if not game.dealer_should_hit():
            break
        try:
            game.dealer_step()
        except Exception:
            return
        await _broadcast_state(table_id)
        await asyncio.sleep(0.8)

    if table_id not in tables:
        return
    # Hold on the final dealer hand so the SFX/overlay reveal lands cleanly.
    await asyncio.sleep(0.6)
    game.resolve()
    await _broadcast_state(table_id)


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

VALID_REACTIONS = {"gg", "nice", "wow", "ouch", "lol", "gl"}
# Rate limit: one reaction per user per N seconds
_reaction_cooldowns: dict[str, float] = {}
REACTION_COOLDOWN = 3.0


@app.websocket("/ws/table/{table_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    table_id: str,
    token: str = Query(...),
    spectate: bool = Query(False),
):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001)
        return

    if table_id not in tables:
        await websocket.close(code=4004)
        return

    user_id = payload["user_id"]
    display_name = payload["display_name"]

    if spectate:
        # Spectator mode: receive broadcasts only, no game participation
        await manager.connect(table_id, user_id, display_name, websocket)
        await _broadcast_state(table_id)
        try:
            while True:
                data = await websocket.receive_json()
                action = data.get("action")
                # Spectators can only react
                if action == "react":
                    await _handle_reaction(table_id, user_id, display_name, data)
        except WebSocketDisconnect:
            manager.disconnect(table_id, user_id)
        return

    # Bot leaves the moment a real human arrives — they never share a round.
    await _despawn_bots(table_id)

    table = tables[table_id]
    game = table["game"]

    if len(game.players) >= TABLE_MAX_PLAYERS and user_id not in game.players:
        await websocket.close(code=4002)
        return

    await manager.connect(table_id, user_id, display_name, websocket)
    game.add_player(user_id, display_name)

    # Load cosmetics into cache for broadcast
    try:
        u = await get_user(user_id)
        if u:
            player_cosmetics[user_id] = u.get("equipped", {})
    except Exception:
        pass

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

            if action == "react":
                await _handle_reaction(table_id, user_id, display_name, data)
                continue

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
            _cancel_dealer_task(table_id)
            # Fixed tables persist; just rebuild a fresh game instance and
            # invite a bot back so the table doesn't sit empty.
            table["game"] = _make_game(table["game_type"])
            await _spawn_bot(table_id)
        else:
            await _broadcast_state(table_id)


async def _handle_reaction(table_id: str, user_id: str, display_name: str, data: dict):
    emoji = data.get("emoji", "")
    if emoji not in VALID_REACTIONS:
        return
    import time
    now = time.monotonic()
    last = _reaction_cooldowns.get(user_id, 0)
    if now - last < REACTION_COOLDOWN:
        return
    _reaction_cooldowns[user_id] = now
    await manager.broadcast(table_id, {
        "type": "reaction",
        "player_id": user_id,
        "display_name": display_name,
        "emoji": emoji,
    })


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
                "code": "bet.minimum",
                "n": min_bet,
            })
            return

        user = await get_user(user_id)
        if not user or user["coins"] < amount:
            await manager.send_to(table_id, user_id, {
                "type": "error",
                "code": "bet.insufficient_coins",
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
                if game.phase == BJPhase.DEALER_TURN:
                    # Dealer-BJ short-circuit: the paced sequence handles the
                    # peek beat → resolve, including the broadcast.
                    _schedule_dealer_sequence(table_id)
                else:
                    await _broadcast_state(table_id)
                    _start_bj_turn_timer(table_id)

    elif action == "hit":
        card = game.hit(user_id)
        if card:
            _cancel_turn_timer(table_id)
            if game.phase == BJPhase.DEALER_TURN:
                # Dealer is about to play — let the paced sequence drive the
                # rest of the broadcasts.
                _schedule_dealer_sequence(table_id)
            else:
                await _broadcast_state(table_id)
                _start_bj_turn_timer(table_id)

    elif action == "stand":
        if game.stand(user_id):
            _cancel_turn_timer(table_id)
            if game.phase == BJPhase.DEALER_TURN:
                _schedule_dealer_sequence(table_id)
            else:
                await _broadcast_state(table_id)
                _start_bj_turn_timer(table_id)

    elif action == "double":
        user = await get_user(user_id)
        player = game.players.get(user_id)
        if player and user and user["coins"] >= player.bet * 2:
            card = game.double_down(user_id)
            if card:
                _cancel_turn_timer(table_id)
                if game.phase == BJPhase.DEALER_TURN:
                    _schedule_dealer_sequence(table_id)
                else:
                    await _broadcast_state(table_id)
                    _start_bj_turn_timer(table_id)
        else:
            await manager.send_to(table_id, user_id, {
                "type": "error",
                "code": "bet.insufficient_for_double",
            })

    elif action == "new_round":
        if game.phase == BJPhase.RESOLUTION:
            _cancel_dealer_task(table_id)
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
                "code": "bet.minimum",
                "n": min_bet,
            })
            return

        user = await get_user(user_id)
        # Pinzoro pays 5x — make sure the player has enough to cover a 5x loss too.
        # Actually the bet itself is the wager; pinzoro on banker's side takes 5x. Require 5x available.
        if not user or user["coins"] < amount * 5:
            await manager.send_to(table_id, user_id, {
                "type": "error",
                "code": "bet.banker_reserve",
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

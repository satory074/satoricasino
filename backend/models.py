from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    display_name: str
    passphrase: str


class LoginRequest(BaseModel):
    display_name: str
    passphrase: str


class TokenResponse(BaseModel):
    token: str
    user_id: str
    display_name: str


class GameStats(BaseModel):
    wins: int = 0
    losses: int = 0
    draws: int = 0
    total_wagered: int = 0
    total_won: int = 0
    biggest_win: int = 0
    hands_played: int = 0


class UserProfile(BaseModel):
    user_id: str
    display_name: str
    coins: int
    wins: int = 0
    losses: int = 0
    draws: int = 0
    last_daily_bonus: Optional[str] = None
    last_bailout: Optional[str] = None
    game_stats: dict[str, GameStats] = {}
    streaks: dict[str, int] = {}
    best_streaks: dict[str, int] = {}
    daily_streak: int = 0
    xp: int = 0
    level: int = 1
    unlocked_achievements: dict[str, str] = {}
    ad_watches_today: int = 0
    last_ad_date: Optional[str] = None


class TableInfo(BaseModel):
    table_id: str
    name: str
    player_count: int
    max_players: int
    min_bet: int
    status: str
    game_type: str = "blackjack"


class GamePhase(str, Enum):
    WAITING = "waiting"
    BETTING = "betting"
    DEALING = "dealing"
    PLAYER_TURNS = "player_turns"
    DEALER_TURN = "dealer_turn"
    RESOLUTION = "resolution"


class CardModel(BaseModel):
    suit: str
    rank: str

    @property
    def display(self) -> str:
        return f"{self.rank}{self.suit}"


class PlayerHandState(BaseModel):
    cards: list[CardModel]
    value: int
    is_busted: bool
    is_blackjack: bool
    bet: int


class GameStateForPlayer(BaseModel):
    phase: GamePhase
    dealer_cards: list[CardModel]
    dealer_value: Optional[int] = None
    players: dict[str, PlayerHandState]
    current_player_id: Optional[str] = None
    results: Optional[dict[str, str]] = None

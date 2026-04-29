from __future__ import annotations

import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Phase(str, Enum):
    WAITING = "waiting"
    BETTING = "betting"
    BANKER_ROLL = "banker_roll"
    PLAYER_ROLLS = "player_rolls"
    RESOLUTION = "resolution"


class HandName(str, Enum):
    PINZORO = "pinzoro"      # 1-1-1
    ARASHI = "arashi"        # X-X-X (X >= 2)
    SHIGORO = "shigoro"      # 4-5-6
    ME = "me"                # pair + eye
    HIFUMI = "hifumi"        # 1-2-3
    MENASHI = "menashi"      # no hand


Dice = tuple[int, int, int]


@dataclass
class HandResult:
    name: HandName
    eye: int  # ARASHI: 2-6 / ME: 1-6 / others: 0

    def to_dict(self) -> dict:
        return {"name": self.name.value, "eye": self.eye}


def evaluate_dice(dice: Dice) -> HandResult:
    a, b, c = sorted(dice)
    if a == b == c:
        if a == 1:
            return HandResult(HandName.PINZORO, 1)
        return HandResult(HandName.ARASHI, a)
    if (a, b, c) == (1, 2, 3):
        return HandResult(HandName.HIFUMI, 0)
    if (a, b, c) == (4, 5, 6):
        return HandResult(HandName.SHIGORO, 0)
    if a == b:
        return HandResult(HandName.ME, c)
    if b == c:
        return HandResult(HandName.ME, a)
    return HandResult(HandName.MENASHI, 0)


def is_settled(dice: Dice) -> bool:
    """Whether the dice form a locked hand (no re-roll allowed)."""
    a, b, c = sorted(dice)
    if a == b or b == c:
        return True
    if (a, b, c) in ((1, 2, 3), (4, 5, 6)):
        return True
    return False


def calculate_payout(
    player_hand: Optional[HandResult],
    banker_hand: HandResult,
    bet: int,
) -> int:
    """Net payout to the player. Positive = player wins, negative = player pays."""
    # 1. Banker auto-resolution specials (apply to all players regardless)
    if banker_hand.name == HandName.PINZORO:
        return -5 * bet
    if banker_hand.name == HandName.ARASHI:
        return -3 * bet
    if banker_hand.name == HandName.SHIGORO:
        return -2 * bet
    if banker_hand.name == HandName.HIFUMI:
        return 2 * bet

    # Banker is ME or MENASHI — player must have rolled.
    if player_hand is None:
        return 0  # defensive; shouldn't happen post-PLAYER_ROLLS

    # 2. Player specials
    if player_hand.name == HandName.PINZORO:
        return 5 * bet
    if player_hand.name == HandName.ARASHI:
        return 3 * bet
    if player_hand.name == HandName.SHIGORO:
        return 2 * bet
    if player_hand.name == HandName.HIFUMI:
        return -2 * bet

    # 3. Player MENASHI is a flat 1x loss
    if player_hand.name == HandName.MENASHI:
        return -bet

    # 4. Player ME, banker MENASHI: player wins
    if banker_hand.name == HandName.MENASHI:
        return bet

    # 5. Both ME: compare eyes
    if player_hand.eye > banker_hand.eye:
        return bet
    if player_hand.eye < banker_hand.eye:
        return -bet
    return 0  # ワカレ (push)


def compare_hands(player: HandResult, banker: HandResult) -> int:
    """For testing: -1 banker wins, 0 push, +1 player wins. Ignores bet."""
    payout = calculate_payout(player, banker, 1)
    if payout > 0:
        return 1
    if payout < 0:
        return -1
    return 0


@dataclass
class ChinchiroPlayer:
    player_id: str
    display_name: str
    bet: int = 0
    rolls: list[Dice] = field(default_factory=list)
    settled: bool = False
    hand: Optional[HandResult] = None


class ChinchiroGame:
    def __init__(self):
        self.phase: Phase = Phase.WAITING
        self.players: dict[str, ChinchiroPlayer] = {}
        self.player_order: list[str] = []
        self.current_player_index: int = 0
        self.banker_rolls: list[Dice] = []
        self.banker_hand: Optional[HandResult] = None
        self.payouts: dict[str, int] = {}

    @property
    def current_player_id(self) -> Optional[str]:
        if self.phase != Phase.PLAYER_ROLLS:
            return None
        if self.current_player_index >= len(self.player_order):
            return None
        return self.player_order[self.current_player_index]

    def add_player(self, player_id: str, display_name: str) -> bool:
        if player_id in self.players:
            return False
        if self.phase not in (Phase.WAITING, Phase.BETTING):
            return False
        self.players[player_id] = ChinchiroPlayer(
            player_id=player_id, display_name=display_name
        )
        if player_id not in self.player_order:
            self.player_order.append(player_id)
        return True

    def remove_player(self, player_id: str) -> None:
        self.players.pop(player_id, None)
        if player_id in self.player_order:
            self.player_order.remove(player_id)

    def start_betting(self) -> bool:
        if self.phase != Phase.WAITING:
            return False
        if not self.players:
            return False
        self.phase = Phase.BETTING
        return True

    def place_bet(self, player_id: str, amount: int) -> bool:
        if self.phase != Phase.BETTING:
            return False
        if player_id not in self.players:
            return False
        if amount <= 0:
            return False
        self.players[player_id].bet = amount
        return True

    def all_bets_placed(self) -> bool:
        return bool(self.players) and all(
            p.bet > 0 for p in self.players.values()
        )

    def begin_banker(self) -> None:
        """Move to BANKER_ROLL phase. Caller is expected to invoke roll_banker next."""
        if self.phase != Phase.BETTING:
            return
        self.phase = Phase.BANKER_ROLL

    def roll_banker(self) -> list[Dice]:
        """Roll banker dice up to 3 times (or until settled). Sets banker_hand. (used by tests)"""
        if self.phase != Phase.BANKER_ROLL:
            return []
        self.banker_rolls = []
        self.banker_hand = None
        while self.banker_hand is None:
            self.banker_step()
        return self.banker_rolls

    def banker_step(self) -> Optional[Dice]:
        """Roll one banker die set. Returns dice rolled, or None if already settled.
        Sets banker_hand once the hand is locked (settled or 3 rolls done)."""
        if self.phase != Phase.BANKER_ROLL:
            return None
        if self.banker_hand is not None:
            return None
        if len(self.banker_rolls) >= 3:
            return None
        dice = self._roll()
        self.banker_rolls.append(dice)
        if is_settled(dice) or len(self.banker_rolls) >= 3:
            self.banker_hand = evaluate_dice(dice)
        return dice

    def banker_special_resolves(self) -> bool:
        """Banker rolled a hand that immediately settles the round for all players."""
        if self.banker_hand is None:
            return False
        return self.banker_hand.name in (
            HandName.PINZORO,
            HandName.ARASHI,
            HandName.SHIGORO,
            HandName.HIFUMI,
        )

    def begin_player_rolls(self) -> None:
        if self.phase != Phase.BANKER_ROLL:
            return
        self.phase = Phase.PLAYER_ROLLS
        self.current_player_index = 0
        self._skip_settled_players()

    def roll_player(self, player_id: str) -> Optional[Dice]:
        if self.phase != Phase.PLAYER_ROLLS:
            return None
        if self.current_player_id != player_id:
            return None
        player = self.players[player_id]
        if player.settled or len(player.rolls) >= 3:
            return None
        dice = self._roll()
        player.rolls.append(dice)
        if is_settled(dice) or len(player.rolls) >= 3:
            player.settled = True
            player.hand = evaluate_dice(dice)
            self._advance_player()
        return dice

    def auto_settle(self, player_id: str) -> None:
        """Mark a player as settled with whatever they currently have (timeout case)."""
        if self.phase != Phase.PLAYER_ROLLS:
            return
        if self.current_player_id != player_id:
            return
        player = self.players[player_id]
        if player.settled:
            return
        if not player.rolls:
            # Force a single roll so they have something
            dice = self._roll()
            player.rolls.append(dice)
        player.settled = True
        player.hand = evaluate_dice(player.rolls[-1])
        self._advance_player()

    def _advance_player(self) -> None:
        self.current_player_index += 1
        self._skip_settled_players()
        if self.current_player_index >= len(self.player_order):
            self.resolve()

    def _skip_settled_players(self) -> None:
        while self.current_player_index < len(self.player_order):
            pid = self.player_order[self.current_player_index]
            if self.players[pid].settled:
                self.current_player_index += 1
            else:
                break

    def resolve(self) -> None:
        if self.banker_hand is None:
            return
        self.phase = Phase.RESOLUTION
        for pid, player in self.players.items():
            self.payouts[pid] = calculate_payout(
                player.hand, self.banker_hand, player.bet
            )

    def calculate_payout_for(self, player_id: str) -> int:
        return self.payouts.get(player_id, 0)

    def get_state(self) -> dict:
        return {
            "phase": self.phase.value,
            "banker_rolls": [list(d) for d in self.banker_rolls],
            "banker_hand": self.banker_hand.to_dict() if self.banker_hand else None,
            "players": {
                pid: {
                    "display_name": p.display_name,
                    "bet": p.bet,
                    "rolls": [list(d) for d in p.rolls],
                    "settled": p.settled,
                    "hand": p.hand.to_dict() if p.hand else None,
                }
                for pid, p in self.players.items()
            },
            "current_player_id": self.current_player_id,
            "payouts": dict(self.payouts) if self.phase == Phase.RESOLUTION else None,
        }

    def reset_for_new_round(self) -> None:
        for p in self.players.values():
            p.bet = 0
            p.rolls = []
            p.settled = False
            p.hand = None
        self.banker_rolls = []
        self.banker_hand = None
        self.payouts = {}
        self.current_player_index = 0
        self.phase = Phase.BETTING

    @staticmethod
    def _roll() -> Dice:
        return (
            random.randint(1, 6),
            random.randint(1, 6),
            random.randint(1, 6),
        )

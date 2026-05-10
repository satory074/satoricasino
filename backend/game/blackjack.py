from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from backend.config import DECK_COUNT, RESHUFFLE_THRESHOLD
from backend.game.deck import Card, Deck, hand_value, is_blackjack


class Phase(str, Enum):
    WAITING = "waiting"
    BETTING = "betting"
    PLAYER_TURNS = "player_turns"
    DEALER_TURN = "dealer_turn"
    RESOLUTION = "resolution"


class Result(str, Enum):
    WIN = "win"
    LOSE = "lose"
    PUSH = "push"
    BLACKJACK = "blackjack"


@dataclass
class PlayerState:
    player_id: str
    display_name: str
    cards: list[Card] = field(default_factory=list)
    bet: int = 0
    is_standing: bool = False
    is_doubled: bool = False

    @property
    def value(self) -> int:
        return hand_value(self.cards)

    @property
    def is_busted(self) -> bool:
        return self.value > 21

    @property
    def is_blackjack(self) -> bool:
        return is_blackjack(self.cards)

    @property
    def is_done(self) -> bool:
        return self.is_standing or self.is_busted


class BlackjackGame:
    def __init__(self):
        self.deck = Deck(DECK_COUNT)
        self.phase = Phase.WAITING
        self.players: dict[str, PlayerState] = {}
        self.player_order: list[str] = []
        self.current_player_index: int = 0
        self.dealer_cards: list[Card] = []
        self.results: dict[str, Result] = {}

    @property
    def current_player_id(self) -> str | None:
        if self.phase != Phase.PLAYER_TURNS:
            return None
        if self.current_player_index >= len(self.player_order):
            return None
        return self.player_order[self.current_player_index]

    def add_player(self, player_id: str, display_name: str) -> bool:
        if player_id in self.players:
            return False
        if self.phase not in (Phase.WAITING, Phase.BETTING):
            return False
        self.players[player_id] = PlayerState(
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
        return all(p.bet > 0 for p in self.players.values())

    def deal(self) -> bool:
        if self.phase != Phase.BETTING:
            return False
        if not self.all_bets_placed():
            return False

        if self.deck.remaining < RESHUFFLE_THRESHOLD:
            self.deck.reshuffle()

        self.dealer_cards = []
        for p in self.players.values():
            p.cards = []
            p.is_standing = False
            p.is_doubled = False
        self.results = {}

        # Deal 2 cards each
        for _ in range(2):
            for pid in self.player_order:
                self.players[pid].cards.append(self.deck.deal())
            self.dealer_cards.append(self.deck.deal())

        self.current_player_index = 0

        # Dealer-BJ short-circuit: hand off to DEALER_TURN so the WS layer
        # can run the paced reveal sequence (peek beat → resolve), instead
        # of jumping straight to RESOLUTION.
        if is_blackjack(self.dealer_cards):
            self.phase = Phase.DEALER_TURN
            return True

        self.phase = Phase.PLAYER_TURNS
        self._skip_done_players()
        return True

    def hit(self, player_id: str) -> Card | None:
        if self.phase != Phase.PLAYER_TURNS:
            return None
        if self.current_player_id != player_id:
            return None

        player = self.players[player_id]
        card = self.deck.deal()
        player.cards.append(card)

        if player.is_busted or player.value == 21:
            player.is_standing = True
            self._advance_player()

        return card

    def stand(self, player_id: str) -> bool:
        if self.phase != Phase.PLAYER_TURNS:
            return False
        if self.current_player_id != player_id:
            return False

        self.players[player_id].is_standing = True
        self._advance_player()
        return True

    def double_down(self, player_id: str) -> Card | None:
        if self.phase != Phase.PLAYER_TURNS:
            return None
        if self.current_player_id != player_id:
            return None

        player = self.players[player_id]
        if len(player.cards) != 2:
            return None

        player.bet *= 2
        player.is_doubled = True
        card = self.deck.deal()
        player.cards.append(card)
        player.is_standing = True
        self._advance_player()
        return card

    def auto_stand(self, player_id: str) -> bool:
        """Called on timeout - auto stand for the player."""
        return self.stand(player_id)

    def _advance_player(self) -> None:
        self.current_player_index += 1
        self._skip_done_players()

        if self.current_player_index >= len(self.player_order):
            self.begin_dealer_turn()

    def _skip_done_players(self) -> None:
        while self.current_player_index < len(self.player_order):
            pid = self.player_order[self.current_player_index]
            player = self.players[pid]
            if player.is_blackjack:
                player.is_standing = True
                self.current_player_index += 1
            elif player.is_done:
                # Defensive: covers any future path that marks a player
                # done (busted/standing) without auto-advancing the index.
                self.current_player_index += 1
            else:
                break

        if self.current_player_index >= len(self.player_order):
            self.begin_dealer_turn()

    def begin_dealer_turn(self) -> None:
        """Transition to DEALER_TURN. Does not draw — the WS layer paces hits via dealer_step()."""
        self.phase = Phase.DEALER_TURN

    def dealer_should_hit(self) -> bool:
        """True when the dealer must draw another card.

        Dealer stands on all 17s (S17). All-busted players short-circuit the loop
        entirely — dealer doesn't risk a bust when it can't lose.
        """
        if self.phase != Phase.DEALER_TURN:
            return False
        if is_blackjack(self.dealer_cards):
            return False
        if self.players and all(p.is_busted for p in self.players.values()):
            return False
        return hand_value(self.dealer_cards) < 17

    def dealer_step(self) -> Card | None:
        """Deal one card to the dealer. Returns the card, or None if not in DEALER_TURN."""
        if self.phase != Phase.DEALER_TURN:
            return None
        card = self.deck.deal()
        self.dealer_cards.append(card)
        return card

    def resolve(self) -> None:
        """Public entry point for the WS layer once the dealer sequence completes."""
        self._resolve()

    def _resolve(self) -> None:
        self.phase = Phase.RESOLUTION
        dealer_val = hand_value(self.dealer_cards)
        dealer_bj = is_blackjack(self.dealer_cards)
        dealer_busted = dealer_val > 21

        for pid, player in self.players.items():
            if player.is_blackjack and not dealer_bj:
                self.results[pid] = Result.BLACKJACK
            elif player.is_busted:
                self.results[pid] = Result.LOSE
            elif dealer_bj:
                if player.is_blackjack:
                    self.results[pid] = Result.PUSH
                else:
                    self.results[pid] = Result.LOSE
            elif dealer_busted:
                self.results[pid] = Result.WIN
            elif player.value > dealer_val:
                self.results[pid] = Result.WIN
            elif player.value < dealer_val:
                self.results[pid] = Result.LOSE
            else:
                self.results[pid] = Result.PUSH

    def calculate_payout(self, player_id: str) -> int:
        """Returns the net coin change for the player."""
        result = self.results.get(player_id)
        player = self.players.get(player_id)
        if not result or not player:
            return 0

        bet = player.bet
        if result == Result.BLACKJACK:
            return int(bet * 1.5)  # 3:2 payout
        elif result == Result.WIN:
            return bet
        elif result == Result.PUSH:
            return 0
        else:  # LOSE
            return -bet

    def get_state(self, hide_dealer_hole: bool = True) -> dict:
        """Get game state, optionally hiding dealer's hole card."""
        dealer_cards = list(self.dealer_cards)
        dealer_value = hand_value(self.dealer_cards)

        if hide_dealer_hole and self.phase == Phase.PLAYER_TURNS and len(dealer_cards) >= 2:
            dealer_cards = [dealer_cards[0], Card(suit="?", rank="?")]
            dealer_value = None

        players_state = {}
        for pid, p in self.players.items():
            players_state[pid] = {
                "display_name": p.display_name,
                "cards": [c.to_dict() for c in p.cards],
                "value": p.value,
                "bet": p.bet,
                "is_busted": p.is_busted,
                "is_blackjack": p.is_blackjack,
                "is_standing": p.is_standing,
            }

        return {
            "phase": self.phase.value,
            "dealer_cards": [c.to_dict() for c in dealer_cards],
            "dealer_value": dealer_value,
            "players": players_state,
            "current_player_id": self.current_player_id,
            "results": {pid: r.value for pid, r in self.results.items()} if self.results else None,
        }

    def reset_for_new_round(self) -> None:
        """Reset the game for a new round, keeping players."""
        for p in self.players.values():
            p.cards = []
            p.bet = 0
            p.is_standing = False
            p.is_doubled = False
        self.dealer_cards = []
        self.results = {}
        self.current_player_index = 0
        self.phase = Phase.BETTING

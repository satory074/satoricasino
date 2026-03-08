from __future__ import annotations

import random
from dataclasses import dataclass

SUITS = ["♠", "♥", "♦", "♣"]
RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]


@dataclass(frozen=True)
class Card:
    suit: str
    rank: str

    @property
    def value(self) -> int:
        if self.rank in ("J", "Q", "K"):
            return 10
        if self.rank == "A":
            return 11
        return int(self.rank)

    def to_dict(self) -> dict:
        return {"suit": self.suit, "rank": self.rank}


def hand_value(cards: list[Card]) -> int:
    total = sum(c.value for c in cards)
    aces = sum(1 for c in cards if c.rank == "A")
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    return total


def is_blackjack(cards: list[Card]) -> bool:
    return len(cards) == 2 and hand_value(cards) == 21


class Deck:
    def __init__(self, num_decks: int = 6):
        self.num_decks = num_decks
        self.cards: list[Card] = []
        self.reshuffle()

    def reshuffle(self) -> None:
        self.cards = [
            Card(suit=s, rank=r)
            for _ in range(self.num_decks)
            for s in SUITS
            for r in RANKS
        ]
        random.shuffle(self.cards)

    def deal(self) -> Card:
        if not self.cards:
            self.reshuffle()
        return self.cards.pop()

    @property
    def remaining(self) -> int:
        return len(self.cards)

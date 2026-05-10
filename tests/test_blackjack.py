from backend.game.blackjack import BlackjackGame, Phase, Result
from backend.game.deck import Card, Deck, hand_value, is_blackjack


def _drive_dealer_to_resolution(game: BlackjackGame) -> None:
    """Pump the dealer step-loop the way the WS sequence would, then resolve.

    Tests use this to flush phase from DEALER_TURN through to RESOLUTION
    in a single synchronous call.
    """
    while game.dealer_should_hit():
        game.dealer_step()
    game.resolve()


class TestDeck:
    def test_deck_size(self):
        deck = Deck(num_decks=6)
        assert deck.remaining == 312

    def test_deal_reduces_count(self):
        deck = Deck(1)
        deck.deal()
        assert deck.remaining == 51

    def test_reshuffle(self):
        deck = Deck(1)
        for _ in range(52):
            deck.deal()
        assert deck.remaining == 0
        deck.reshuffle()
        assert deck.remaining == 52


class TestHandValue:
    def test_simple_hand(self):
        cards = [Card("♠", "5"), Card("♥", "3")]
        assert hand_value(cards) == 8

    def test_face_cards(self):
        cards = [Card("♠", "K"), Card("♥", "Q")]
        assert hand_value(cards) == 20

    def test_ace_as_11(self):
        cards = [Card("♠", "A"), Card("♥", "9")]
        assert hand_value(cards) == 20

    def test_ace_as_1(self):
        cards = [Card("♠", "A"), Card("♥", "9"), Card("♦", "5")]
        assert hand_value(cards) == 15

    def test_two_aces(self):
        cards = [Card("♠", "A"), Card("♥", "A")]
        assert hand_value(cards) == 12

    def test_blackjack(self):
        cards = [Card("♠", "A"), Card("♥", "K")]
        assert hand_value(cards) == 21
        assert is_blackjack(cards)

    def test_not_blackjack_three_cards(self):
        cards = [Card("♠", "7"), Card("♥", "7"), Card("♦", "7")]
        assert hand_value(cards) == 21
        assert not is_blackjack(cards)


class TestBlackjackGame:
    def _make_game_with_players(self, *names):
        game = BlackjackGame()
        for i, name in enumerate(names):
            game.add_player(f"p{i}", name)
        return game

    def test_add_player(self):
        game = BlackjackGame()
        assert game.add_player("p1", "Alice")
        assert "p1" in game.players

    def test_cannot_add_duplicate(self):
        game = BlackjackGame()
        game.add_player("p1", "Alice")
        assert not game.add_player("p1", "Alice")

    def test_start_betting(self):
        game = self._make_game_with_players("Alice")
        assert game.start_betting()
        assert game.phase == Phase.BETTING

    def test_cannot_start_empty(self):
        game = BlackjackGame()
        assert not game.start_betting()

    def test_place_bet(self):
        game = self._make_game_with_players("Alice")
        game.start_betting()
        assert game.place_bet("p0", 100)
        assert game.players["p0"].bet == 100

    def test_deal(self):
        game = self._make_game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        assert game.deal()
        assert len(game.players["p0"].cards) == 2
        assert len(game.dealer_cards) == 2

    def test_hit(self):
        game = self._make_game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        game.deal()
        if game.phase == Phase.PLAYER_TURNS:
            initial = len(game.players["p0"].cards)
            card = game.hit("p0")
            if card:
                assert len(game.players["p0"].cards) == initial + 1

    def test_stand(self):
        game = self._make_game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        game.deal()
        if game.phase == Phase.PLAYER_TURNS:
            game.stand("p0")
            assert game.phase in (Phase.DEALER_TURN, Phase.RESOLUTION)

    def test_full_round_single_player(self):
        game = self._make_game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        game.deal()

        # Play until the dealer takes over
        while game.phase == Phase.PLAYER_TURNS and game.current_player_id == "p0":
            game.stand("p0")

        # _advance_player now leaves us in DEALER_TURN; the WS layer paces the
        # rest of the sequence. Tests drive it manually.
        assert game.phase in (Phase.DEALER_TURN, Phase.RESOLUTION)
        _drive_dealer_to_resolution(game)
        assert game.phase == Phase.RESOLUTION
        assert "p0" in game.results

    def test_payout_win(self):
        game = BlackjackGame()
        game.add_player("p0", "Alice")
        game.players["p0"].bet = 100
        game.results["p0"] = Result.WIN
        assert game.calculate_payout("p0") == 100

    def test_payout_blackjack(self):
        game = BlackjackGame()
        game.add_player("p0", "Alice")
        game.players["p0"].bet = 100
        game.results["p0"] = Result.BLACKJACK
        assert game.calculate_payout("p0") == 150

    def test_payout_lose(self):
        game = BlackjackGame()
        game.add_player("p0", "Alice")
        game.players["p0"].bet = 100
        game.results["p0"] = Result.LOSE
        assert game.calculate_payout("p0") == -100

    def test_payout_push(self):
        game = BlackjackGame()
        game.add_player("p0", "Alice")
        game.players["p0"].bet = 100
        game.results["p0"] = Result.PUSH
        assert game.calculate_payout("p0") == 0

    def test_reset_for_new_round(self):
        game = self._make_game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        game.deal()
        while game.phase == Phase.PLAYER_TURNS:
            game.stand(game.current_player_id)
        _drive_dealer_to_resolution(game)
        game.reset_for_new_round()
        assert game.phase == Phase.BETTING
        assert game.players["p0"].bet == 0
        assert game.players["p0"].cards == []

    def test_multi_player(self):
        game = self._make_game_with_players("Alice", "Bob")
        game.start_betting()
        game.place_bet("p0", 50)
        game.place_bet("p1", 100)
        game.deal()

        while game.phase == Phase.PLAYER_TURNS:
            pid = game.current_player_id
            if pid:
                game.stand(pid)

        assert game.phase in (Phase.DEALER_TURN, Phase.RESOLUTION)
        _drive_dealer_to_resolution(game)
        assert game.phase == Phase.RESOLUTION
        assert "p0" in game.results
        assert "p1" in game.results

    def test_get_state(self):
        game = self._make_game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        game.deal()
        state = game.get_state(hide_dealer_hole=True)
        assert "phase" in state
        assert "dealer_cards" in state
        assert "players" in state

    def test_double_down(self):
        game = self._make_game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        game.deal()
        if game.phase == Phase.PLAYER_TURNS and game.current_player_id == "p0":
            card = game.double_down("p0")
            if card:
                assert game.players["p0"].bet == 200
                assert game.players["p0"].is_doubled
                assert len(game.players["p0"].cards) == 3


class TestDealerStateMachine:
    """Cover the paced dealer-turn API the WS layer drives."""

    def _seeded_game(self, dealer_up, dealer_hole, player_cards, *next_dealer_cards):
        """Build a game with a deterministic deck so deal() lands a known state.

        The deck pops from the end, so we order entries in *reverse* of draw
        order: each `Deck.deal()` calls `cards.pop()`. We also pad the bottom
        of the deck so deal() doesn't trip the reshuffle threshold and clobber
        the seed.
        """
        game = BlackjackGame()
        game.add_player("p0", "Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        # Draw order during deal(): P0 card1, dealer up, P0 card2, dealer hole.
        # Then any subsequent player hits + dealer hits in that order.
        ordered = [
            player_cards[0],
            dealer_up,
            player_cards[1],
            dealer_hole,
            *next_dealer_cards,
        ]
        # Pad with a dummy 2♠ at the *front* (popped last) — well above the
        # 60-card reshuffle threshold so deal() leaves the seed untouched.
        padding = [Card("♠", "2")] * 80
        game.deck.cards = padding + list(reversed(ordered))
        return game

    def test_stand_leaves_dealer_turn_until_resolved(self):
        game = self._seeded_game(
            Card("♠", "10"),
            Card("♥", "7"),
            [Card("♣", "9"), Card("♦", "8")],  # player has 17, will stand
        )
        game.deal()
        assert game.phase == Phase.PLAYER_TURNS
        game.stand("p0")
        # Dealer phase entered, but no resolution until the WS layer pumps it.
        assert game.phase == Phase.DEALER_TURN
        assert not game.results
        # Dealer hole is 7 + 10 = 17, so dealer must NOT hit on S17.
        assert not game.dealer_should_hit()
        game.resolve()
        assert game.phase == Phase.RESOLUTION
        assert "p0" in game.results

    def test_dealer_blackjack_routes_through_dealer_turn(self):
        # Dealer A + 10 = blackjack at deal time.
        game = self._seeded_game(
            Card("♠", "A"),
            Card("♥", "10"),
            [Card("♣", "9"), Card("♦", "8")],  # player 17, irrelevant
        )
        game.deal()
        # Pre-fix this jumped straight to RESOLUTION.
        assert game.phase == Phase.DEALER_TURN
        assert is_blackjack(game.dealer_cards)
        # No further dealer hits needed on a natural.
        assert not game.dealer_should_hit()
        game.resolve()
        assert game.phase == Phase.RESOLUTION
        assert game.results["p0"] == Result.LOSE

    def test_all_busted_dealer_does_not_hit(self):
        # Player draws into a bust; dealer holds a soft total below 17 but
        # shouldn't bother hitting because the player is already busted.
        game = self._seeded_game(
            Card("♠", "5"),
            Card("♥", "6"),  # dealer 11
            [Card("♣", "10"), Card("♦", "10")],  # player 20
            Card("♠", "10"),  # this would push player to 30 (bust)
        )
        game.deal()
        game.hit("p0")
        assert game.players["p0"].is_busted
        assert game.phase == Phase.DEALER_TURN
        # Dealer is on 11 — would normally hit — but everyone already busted.
        assert not game.dealer_should_hit()

    def test_dealer_step_loop_with_multiple_hits(self):
        # Dealer 6+5 = 11. Hits: K (21) → stops.
        game = self._seeded_game(
            Card("♠", "6"),
            Card("♥", "5"),
            [Card("♣", "10"), Card("♦", "9")],  # player 19
            Card("♠", "K"),  # dealer hit lands on 21
        )
        game.deal()
        game.stand("p0")
        assert game.phase == Phase.DEALER_TURN
        assert hand_value(game.dealer_cards) == 11
        steps = 0
        while game.dealer_should_hit():
            assert game.dealer_step() is not None
            steps += 1
        assert steps == 1
        assert hand_value(game.dealer_cards) == 21
        game.resolve()
        assert game.results["p0"] == Result.LOSE  # dealer 21 vs player 19

    def test_skip_done_players_handles_busted_player(self):
        # Multi-player: P0 busts via hit, _advance_player should leave us at P1
        # (not loop back through the busted seat).
        game = BlackjackGame()
        game.add_player("p0", "Alice")
        game.add_player("p1", "Bob")
        game.start_betting()
        game.place_bet("p0", 100)
        game.place_bet("p1", 100)
        # Deal order: P0 c1, P1 c1, dealer up, P0 c2, P1 c2, dealer hole.
        ordered = [
            Card("♣", "10"),  # P0 c1
            Card("♣", "9"),   # P1 c1
            Card("♥", "5"),   # dealer up
            Card("♦", "10"),  # P0 c2 → P0 = 20
            Card("♦", "8"),   # P1 c2 → P1 = 17
            Card("♥", "6"),   # dealer hole → 11
            Card("♠", "K"),   # P0 hit → bust (30)
        ]
        padding = [Card("♠", "2")] * 80
        game.deck.cards = padding + list(reversed(ordered))
        game.deal()
        assert game.current_player_id == "p0"
        game.hit("p0")
        assert game.players["p0"].is_busted
        # Should now be P1's turn, not stuck on the busted P0 seat.
        assert game.current_player_id == "p1"
        assert game.phase == Phase.PLAYER_TURNS

    def test_dealer_should_hit_is_phase_gated(self):
        game = BlackjackGame()
        # Outside DEALER_TURN, the predicate must be False so the WS sequence
        # never runs from the wrong phase.
        assert not game.dealer_should_hit()
        game.dealer_cards = [Card("♥", "5"), Card("♦", "5")]
        game.phase = Phase.PLAYER_TURNS
        assert not game.dealer_should_hit()

    def test_dealer_step_returns_none_outside_dealer_turn(self):
        game = BlackjackGame()
        assert game.dealer_step() is None

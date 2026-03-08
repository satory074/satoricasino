from backend.game.blackjack import BlackjackGame, Phase, Result
from backend.game.deck import Card, Deck, hand_value, is_blackjack


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

        # Play until resolution
        while game.phase == Phase.PLAYER_TURNS and game.current_player_id == "p0":
            game.stand("p0")

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

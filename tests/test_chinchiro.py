from backend.game.chinchiro import (
    ChinchiroGame,
    HandName,
    HandResult,
    Phase,
    calculate_payout,
    compare_hands,
    evaluate_dice,
    is_settled,
)


class TestEvaluateDice:
    def test_pinzoro(self):
        h = evaluate_dice((1, 1, 1))
        assert h.name == HandName.PINZORO
        assert h.eye == 1

    def test_arashi_six(self):
        h = evaluate_dice((6, 6, 6))
        assert h.name == HandName.ARASHI
        assert h.eye == 6

    def test_arashi_two(self):
        h = evaluate_dice((2, 2, 2))
        assert h.name == HandName.ARASHI
        assert h.eye == 2

    def test_shigoro(self):
        assert evaluate_dice((4, 5, 6)).name == HandName.SHIGORO
        assert evaluate_dice((6, 5, 4)).name == HandName.SHIGORO  # order independent

    def test_hifumi(self):
        assert evaluate_dice((1, 2, 3)).name == HandName.HIFUMI
        assert evaluate_dice((3, 1, 2)).name == HandName.HIFUMI

    def test_me_high_eye(self):
        h = evaluate_dice((3, 3, 6))
        assert h.name == HandName.ME
        assert h.eye == 6

    def test_me_low_eye(self):
        h = evaluate_dice((5, 5, 1))
        assert h.name == HandName.ME
        assert h.eye == 1

    def test_me_pair_in_middle(self):
        h = evaluate_dice((2, 4, 4))
        assert h.name == HandName.ME
        assert h.eye == 2

    def test_menashi(self):
        assert evaluate_dice((1, 3, 5)).name == HandName.MENASHI
        assert evaluate_dice((2, 4, 6)).name == HandName.MENASHI


class TestIsSettled:
    def test_pair_settles(self):
        assert is_settled((3, 3, 5))

    def test_triple_settles(self):
        assert is_settled((4, 4, 4))

    def test_shigoro_settles(self):
        assert is_settled((4, 5, 6))

    def test_hifumi_settles(self):
        assert is_settled((1, 2, 3))

    def test_no_pair_no_special(self):
        assert not is_settled((1, 3, 5))
        assert not is_settled((2, 4, 6))


class TestPayout:
    def test_player_pinzoro_beats_banker_me(self):
        player = HandResult(HandName.PINZORO, 1)
        banker = HandResult(HandName.ME, 6)
        assert calculate_payout(player, banker, 100) == 500

    def test_banker_pinzoro_beats_everything(self):
        banker = HandResult(HandName.PINZORO, 1)
        # Even if player would have rolled pinzoro themselves, banker pinzoro auto-resolves
        player = HandResult(HandName.PINZORO, 1)
        assert calculate_payout(player, banker, 100) == -500
        assert calculate_payout(None, banker, 100) == -500

    def test_banker_arashi(self):
        banker = HandResult(HandName.ARASHI, 5)
        assert calculate_payout(None, banker, 100) == -300

    def test_banker_shigoro(self):
        banker = HandResult(HandName.SHIGORO, 0)
        assert calculate_payout(None, banker, 100) == -200

    def test_banker_hifumi_pays_double(self):
        banker = HandResult(HandName.HIFUMI, 0)
        # Player gets 2x regardless of their hand
        assert calculate_payout(None, banker, 100) == 200
        player = HandResult(HandName.MENASHI, 0)
        assert calculate_payout(player, banker, 100) == 200

    def test_player_arashi_beats_banker_me(self):
        player = HandResult(HandName.ARASHI, 4)
        banker = HandResult(HandName.ME, 6)
        assert calculate_payout(player, banker, 100) == 300

    def test_player_shigoro_beats_banker_me(self):
        player = HandResult(HandName.SHIGORO, 0)
        banker = HandResult(HandName.ME, 6)
        assert calculate_payout(player, banker, 100) == 200

    def test_player_me_higher_eye_wins(self):
        player = HandResult(HandName.ME, 6)
        banker = HandResult(HandName.ME, 3)
        assert calculate_payout(player, banker, 100) == 100

    def test_player_me_lower_eye_loses(self):
        player = HandResult(HandName.ME, 2)
        banker = HandResult(HandName.ME, 5)
        assert calculate_payout(player, banker, 100) == -100

    def test_same_eye_pushes(self):
        player = HandResult(HandName.ME, 4)
        banker = HandResult(HandName.ME, 4)
        assert calculate_payout(player, banker, 100) == 0

    def test_player_me_beats_banker_menashi(self):
        player = HandResult(HandName.ME, 1)
        banker = HandResult(HandName.MENASHI, 0)
        assert calculate_payout(player, banker, 100) == 100

    def test_player_menashi_loses_to_banker_me(self):
        player = HandResult(HandName.MENASHI, 0)
        banker = HandResult(HandName.ME, 3)
        assert calculate_payout(player, banker, 100) == -100

    def test_player_menashi_loses_to_banker_menashi(self):
        # House edge: in menashi vs menashi, banker keeps the bet
        player = HandResult(HandName.MENASHI, 0)
        banker = HandResult(HandName.MENASHI, 0)
        assert calculate_payout(player, banker, 100) == -100

    def test_player_hifumi_loses_double(self):
        player = HandResult(HandName.HIFUMI, 0)
        banker = HandResult(HandName.ME, 3)
        assert calculate_payout(player, banker, 100) == -200


class TestBankerEdge:
    """Banker specials are absolute — they short-circuit before any player comparison."""

    def test_banker_arashi_beats_player_pinzoro(self):
        # In real play the player wouldn't have rolled, but the math should still hold.
        player = HandResult(HandName.PINZORO, 1)
        banker = HandResult(HandName.ARASHI, 6)
        assert compare_hands(player, banker) == -1

    def test_hifumi_player_loses_to_banker_normal_hand(self):
        player = HandResult(HandName.HIFUMI, 0)
        banker = HandResult(HandName.MENASHI, 0)
        assert compare_hands(player, banker) == -1


class TestGameFlow:
    def _game_with_players(self, *names) -> ChinchiroGame:
        game = ChinchiroGame()
        for i, name in enumerate(names):
            game.add_player(f"p{i}", name)
        return game

    def test_add_player(self):
        game = ChinchiroGame()
        assert game.add_player("p1", "Alice")
        assert "p1" in game.players

    def test_cannot_double_add(self):
        game = ChinchiroGame()
        game.add_player("p1", "Alice")
        assert not game.add_player("p1", "Alice")

    def test_start_betting_requires_player(self):
        game = ChinchiroGame()
        assert not game.start_betting()
        game.add_player("p1", "Alice")
        assert game.start_betting()
        assert game.phase == Phase.BETTING

    def test_full_round_with_normal_banker(self, monkeypatch):
        game = self._game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        assert game.all_bets_placed()

        # Force banker to a normal ME hand
        rolls_iter = iter([(2, 2, 5)])
        monkeypatch.setattr(game, "_roll", lambda: next(rolls_iter))
        game.begin_banker()
        game.roll_banker()
        assert game.banker_hand.name == HandName.ME
        assert game.banker_hand.eye == 5
        assert not game.banker_special_resolves()

        # Player rolls and gets a higher ME
        rolls_iter = iter([(6, 6, 1)])
        monkeypatch.setattr(game, "_roll", lambda: next(rolls_iter))
        game.begin_player_rolls()
        game.roll_player("p0")
        assert game.players["p0"].hand.name == HandName.ME
        assert game.players["p0"].hand.eye == 1
        # Player ME eye=1 vs banker ME eye=5 → player loses
        assert game.phase == Phase.RESOLUTION
        assert game.calculate_payout_for("p0") == -100

    def test_banker_pinzoro_short_circuits(self, monkeypatch):
        game = self._game_with_players("Alice", "Bob")
        game.start_betting()
        game.place_bet("p0", 100)
        game.place_bet("p1", 50)

        rolls_iter = iter([(1, 1, 1)])
        monkeypatch.setattr(game, "_roll", lambda: next(rolls_iter))
        game.begin_banker()
        game.roll_banker()
        assert game.banker_hand.name == HandName.PINZORO
        assert game.banker_special_resolves()

        game.resolve()
        assert game.phase == Phase.RESOLUTION
        assert game.calculate_payout_for("p0") == -500
        assert game.calculate_payout_for("p1") == -250

    def test_banker_three_rolls_until_settled(self, monkeypatch):
        game = self._game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 50)

        rolls = iter([(1, 3, 5), (2, 4, 6), (3, 3, 5)])
        monkeypatch.setattr(game, "_roll", lambda: next(rolls))
        game.begin_banker()
        result = game.roll_banker()
        assert len(result) == 3
        assert game.banker_hand.name == HandName.ME
        assert game.banker_hand.eye == 5

    def test_banker_menashi_after_3_rolls(self, monkeypatch):
        game = self._game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 50)

        rolls = iter([(1, 3, 5), (2, 4, 6), (1, 3, 5)])
        monkeypatch.setattr(game, "_roll", lambda: next(rolls))
        game.begin_banker()
        game.roll_banker()
        assert game.banker_hand.name == HandName.MENASHI
        assert not game.banker_special_resolves()

    def test_player_settles_on_first_pair(self, monkeypatch):
        game = self._game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)

        # Banker rolls menashi (so player gets to roll)
        rolls = iter([(1, 3, 5), (2, 4, 6), (1, 3, 5)])
        monkeypatch.setattr(game, "_roll", lambda: next(rolls))
        game.begin_banker()
        game.roll_banker()
        game.begin_player_rolls()

        # Player rolls a pair on first try
        rolls = iter([(4, 4, 2)])
        monkeypatch.setattr(game, "_roll", lambda: next(rolls))
        result = game.roll_player("p0")
        assert result == (4, 4, 2)
        assert game.players["p0"].settled
        assert len(game.players["p0"].rolls) == 1

    def test_reset_for_new_round(self, monkeypatch):
        game = self._game_with_players("Alice")
        game.start_betting()
        game.place_bet("p0", 100)
        rolls_iter = iter([(1, 1, 1)])
        monkeypatch.setattr(game, "_roll", lambda: next(rolls_iter))
        game.begin_banker()
        game.roll_banker()
        game.resolve()

        game.reset_for_new_round()
        assert game.phase == Phase.BETTING
        assert game.players["p0"].bet == 0
        assert game.players["p0"].hand is None
        assert game.banker_hand is None
        assert game.payouts == {}

    def test_state_serialization(self):
        game = self._game_with_players("Alice")
        state = game.get_state()
        assert state["phase"] == "waiting"
        assert state["banker_hand"] is None
        assert "p0" in state["players"]
        assert state["players"]["p0"]["display_name"] == "Alice"

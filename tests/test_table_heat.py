"""Tests for table heat tracking — the social signal shown in-game.

Heat counts how many jackpots have happened on this table within the past 5
minutes. The aim is purely visual ("this table is hot"), so we only need the
deque + window logic to be sane; integration with `_broadcast_*` is exercised
implicitly by the broadcast paths in test_blackjack/test_chinchiro.
"""

import collections
import time

import backend.main as bm


def _make_table():
    return {
        "name": "test",
        "min_bet": 10,
        "game": None,
        "game_type": "blackjack",
        "recent_jackpots": collections.deque(maxlen=20),
    }


class TestTableHeatEmpty:
    def test_no_jackpots_yields_zero(self):
        table = _make_table()
        heat = bm._table_heat(table)
        assert heat == {"jackpots5min": 0, "hot": False, "ultra_hot": False}

    def test_missing_deque_is_safe(self):
        table = {"name": "t", "min_bet": 10, "game": None, "game_type": "blackjack"}
        heat = bm._table_heat(table)
        assert heat == {"jackpots5min": 0, "hot": False, "ultra_hot": False}


class TestTableHeatRecord:
    def test_one_jackpot_is_warm_not_hot(self):
        table = _make_table()
        bm._record_jackpot(table)
        heat = bm._table_heat(table)
        assert heat["jackpots5min"] == 1
        assert heat["hot"] is False
        assert heat["ultra_hot"] is False

    def test_two_jackpots_is_hot(self):
        table = _make_table()
        bm._record_jackpot(table)
        bm._record_jackpot(table)
        heat = bm._table_heat(table)
        assert heat["jackpots5min"] == 2
        assert heat["hot"] is True
        assert heat["ultra_hot"] is False

    def test_five_jackpots_is_ultra_hot(self):
        table = _make_table()
        for _ in range(5):
            bm._record_jackpot(table)
        heat = bm._table_heat(table)
        assert heat["jackpots5min"] == 5
        assert heat["hot"] is True
        assert heat["ultra_hot"] is True


class TestTableHeatExpiry:
    def test_old_jackpots_drop_out_of_window(self):
        table = _make_table()
        # Jackpot from 6 minutes ago — outside the 5-minute window
        table["recent_jackpots"].append(time.time() - 360)
        # And one fresh
        bm._record_jackpot(table)
        heat = bm._table_heat(table)
        assert heat["jackpots5min"] == 1
        assert heat["hot"] is False

    def test_deque_bounded_at_20(self):
        table = _make_table()
        for _ in range(50):
            bm._record_jackpot(table)
        # maxlen=20 keeps memory bounded even on a runaway-busy table
        assert len(table["recent_jackpots"]) == 20

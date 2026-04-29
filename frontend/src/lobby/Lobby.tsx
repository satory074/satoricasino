import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { apiGet, apiPost, clearAuth } from "../shared/api/api";
import type { TableInfo, UserProfile } from "../shared/types/game";

const SUPPORTED_GAMES = [
  {
    value: "blackjack",
    label: "Blackjack",
    icon: "♠♥",
    tagline: "21 を超えずにディーラーに勝つ古典",
  },
  {
    value: "chinchiro",
    label: "チンチロ",
    icon: "🎲",
    tagline: "茶碗にサイコロ3つ、出目で勝負の和風博打",
  },
] as const;

interface Props {
  onJoinTable: (tableId: string, gameType: string) => void;
  onLogout: () => void;
  onCoinsChanged: (coins: number, delta: number) => void;
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  play: (id:
    | "button_click"
    | "bonus"
    | "near_miss"
    | "count_up") => void;
}

const GAME_LABEL: Record<string, string> = SUPPORTED_GAMES.reduce(
  (acc, g) => ({ ...acc, [g.value]: g.label }),
  {},
);

interface BonusModal {
  title: string;
  amount: number;
  msg: string;
}

export function Lobby({
  onJoinTable,
  onLogout,
  onCoinsChanged,
  profile,
  setProfile,
  play,
}: Props) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [bonus, setBonus] = useState<BonusModal | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await apiGet<UserProfile>("/api/me");
      setProfile(p);
    } catch {
      clearAuth();
      onLogout();
    }
  }, [setProfile, onLogout]);

  const loadTables = useCallback(async () => {
    try {
      const t = await apiGet<TableInfo[]>("/api/tables");
      setTables(t);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
    void loadTables();
    const id = window.setInterval(loadTables, 3000);
    return () => clearInterval(id);
  }, [refreshProfile, loadTables]);

  const pickGame = (value: string) => {
    play("button_click");
    setSelectedGame(value);
  };

  const backToGames = () => {
    play("button_click");
    setSelectedGame(null);
  };

  const claimDailyBonus = async () => {
    play("button_click");
    try {
      const result = await apiPost<{ coins: number; bonus: number }>(
        "/api/daily-bonus",
        {},
      );
      const prev = profile?.coins ?? 0;
      onCoinsChanged(result.coins, result.coins - prev);
      setBonus({
        title: "Daily Bonus",
        amount: result.bonus,
        msg: "See you again tomorrow!",
      });
      play("bonus");
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.55 },
        colors: ["#f4c430", "#ffd84a", "#c41e3a", "#ffffff"],
      });
      await refreshProfile();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const claimBailout = async () => {
    play("button_click");
    try {
      const result = await apiPost<{ coins: number; bailout: number }>(
        "/api/bailout",
        {},
      );
      const prev = profile?.coins ?? 0;
      onCoinsChanged(result.coins, result.coins - prev);
      setBonus({
        title: "Emergency Rescue",
        amount: result.bailout,
        msg: "Try not to bust again.",
      });
      play("bonus");
      await refreshProfile();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const logout = () => {
    play("button_click");
    clearAuth();
    onLogout();
  };

  const filteredTables = selectedGame
    ? tables.filter((t) => (t.game_type ?? "blackjack") === selectedGame)
    : [];
  const selectedGameMeta = SUPPORTED_GAMES.find((g) => g.value === selectedGame);

  return (
    <div className="lobby-section">
      <div className="lobby-actions">
        <button className="btn-secondary" onClick={claimDailyBonus}>
          Daily Bonus
        </button>
        <button className="btn-secondary" onClick={claimBailout}>
          Bailout
        </button>
        <button className="btn-danger" onClick={logout}>
          Logout
        </button>
      </div>

      {selectedGame === null ? (
        <>
          <h3>Choose Your Game</h3>
          <div className="game-grid">
            {SUPPORTED_GAMES.map((g) => {
              const tableCount = tables.filter(
                (t) => (t.game_type ?? "blackjack") === g.value,
              ).length;
              return (
                <button
                  key={g.value}
                  className="game-card"
                  onClick={() => pickGame(g.value)}
                  type="button"
                >
                  <div className="game-card-icon">{g.icon}</div>
                  <div className="game-card-title">{g.label}</div>
                  <div className="game-card-tagline">{g.tagline}</div>
                  <div className="game-card-meta">{tableCount} tables open</div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <button className="lobby-back" onClick={backToGames} type="button">
            ← ゲーム選択に戻る
          </button>
          <h3>{selectedGameMeta?.label ?? selectedGame} のテーブル</h3>
          {filteredTables.length === 0 ? (
            <div className="empty-msg">テーブルを準備中…</div>
          ) : (
            filteredTables.map((t) => {
              const isFull = t.player_count >= t.max_players;
              return (
                <div
                  key={t.table_id}
                  className={`table-card${isFull ? " is-full" : ""}`}
                  onClick={() => {
                    if (isFull) return;
                    play("button_click");
                    onJoinTable(t.table_id, t.game_type ?? "blackjack");
                  }}
                >
                  <div>
                    <div className="table-name">{t.name}</div>
                    <div className="table-info">
                      <span className="pill pill-game">
                        {GAME_LABEL[t.game_type ?? "blackjack"] ??
                          (t.game_type ?? "blackjack")}
                      </span>
                      <span className="pill">
                        {t.player_count}/{t.max_players} seats
                      </span>
                      <span className="pill">Min {t.min_bet}</span>
                      <span className="pill">{t.status}</span>
                    </div>
                  </div>
                  <button className="btn-primary" disabled={isFull}>
                    {isFull ? "Full" : "Join"}
                  </button>
                </div>
              );
            })
          )}
        </>
      )}

      <AnimatePresence>
        {bonus && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBonus(null)}
          >
            <motion.div
              className="modal-card"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-title">{bonus.title}</div>
              <CountUp value={bonus.amount} prefix="+" />
              <div className="modal-msg">{bonus.msg}</div>
              <button className="btn-primary" onClick={() => setBonus(null)}>
                Collect
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div className="modal-amount">
      {prefix}
      {shown.toLocaleString()}
    </div>
  );
}

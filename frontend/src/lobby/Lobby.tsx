import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { apiGet, apiPost, clearAuth } from "../shared/api/api";
import { useTranslation } from "../shared/i18n/useTranslation";
import type { TableInfo, UserProfile } from "../shared/types/game";

const SUPPORTED_GAMES = [
  { value: "blackjack", icon: "♠♥" },
  { value: "chinchiro", icon: "🎲" },
] as const;

type TablePrefix = "bj" | "cc";
type TableTier = "low" | "mid" | "high";

function resolveTableName(
  t: (key: string, params?: Record<string, string | number>) => string,
  tableId: string,
  fallback: string,
): string {
  const [prefix, tier] = tableId.split("-");
  if (
    (prefix === "bj" || prefix === "cc") &&
    (tier === "low" || tier === "mid" || tier === "high")
  ) {
    return t(`tables.${prefix as TablePrefix}.${tier as TableTier}`);
  }
  return fallback;
}

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
  const { t } = useTranslation();
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
      const tbls = await apiGet<TableInfo[]>("/api/tables");
      setTables(tbls);
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
    ? tables.filter((tbl) => (tbl.game_type ?? "blackjack") === selectedGame)
    : [];
  const selectedGameLabel = selectedGame
    ? t(`games.${selectedGame}.label`)
    : "";

  return (
    <div className="lobby-section">
      <div className="lobby-actions">
        <button className="btn-secondary" style={{ position: "relative" }} onClick={claimDailyBonus}>
          Daily Bonus
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const last = profile?.last_daily_bonus?.slice(0, 10);
            return last !== today ? <span className="notify-dot" /> : null;
          })()}
        </button>
        <button className="btn-secondary" style={{ position: "relative" }} onClick={claimBailout}>
          Bailout
          {profile?.coins !== undefined && profile.coins < 100 && (
            <span className="notify-dot" />
          )}
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
                (tbl) => (tbl.game_type ?? "blackjack") === g.value,
              ).length;
              return (
                <button
                  key={g.value}
                  className="game-card"
                  onClick={() => pickGame(g.value)}
                  type="button"
                >
                  <span className="notify-dot" />
                  <div className="game-card-icon">{g.icon}</div>
                  <div className="game-card-title">
                    {t(`games.${g.value}.label`)}
                  </div>
                  <div className="game-card-tagline">
                    {t(`games.${g.value}.tagline`)}
                  </div>
                  <div className="game-card-meta">{tableCount} tables open</div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <button className="lobby-back" onClick={backToGames} type="button">
            {t("lobby.backToGames")}
          </button>
          <h3>{t("lobby.tablesTitle", { game: selectedGameLabel })}</h3>
          {filteredTables.length === 0 ? (
            <div className="empty-msg">{t("lobby.loadingTables")}</div>
          ) : (
            filteredTables.map((tbl) => {
              const isFull = tbl.player_count >= tbl.max_players;
              const gameType = tbl.game_type ?? "blackjack";
              return (
                <div
                  key={tbl.table_id}
                  className={`table-card${isFull ? " is-full" : ""}`}
                  onClick={() => {
                    if (isFull) return;
                    play("button_click");
                    onJoinTable(tbl.table_id, gameType);
                  }}
                >
                  <div>
                    <div className="table-name">
                      {resolveTableName(t, tbl.table_id, tbl.name)}
                    </div>
                    <div className="table-info">
                      <span className="pill pill-game">
                        {t(`games.${gameType}.label`)}
                      </span>
                      <span className="pill">
                        {tbl.player_count}/{tbl.max_players} seats
                      </span>
                      <span className="pill">Min {tbl.min_bet}</span>
                      <span className="pill">{tbl.status}</span>
                    </div>
                  </div>
                  <button className="btn-primary" disabled={isFull} style={{ position: "relative" }}>
                    {isFull ? "Full" : "Join"}
                    {!isFull && <span className="notify-dot" />}
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

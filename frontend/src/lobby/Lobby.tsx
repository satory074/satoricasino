import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { apiGet, apiPost, ApiError, clearAuth } from "../shared/api/api";
import { useTranslation } from "../shared/i18n/useTranslation";
import { Leaderboard } from "./Leaderboard";
import { AchievementList } from "./AchievementList";
import { Challenges } from "./Challenges";
import { Shop } from "./Shop";
import { AdPlayer } from "../shared/components/AdPlayer";
import { BannerAd } from "../shared/components/BannerAd";
import { InterstitialAd } from "../shared/components/InterstitialAd";
import { useInterstitial } from "../shared/hooks/useInterstitial";
import type { GameStatsEntry, TableInfo, UserProfile } from "../shared/types/game";

const AD_REWARD_DAILY_CAP = 5;

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
  onJoinTable: (tableId: string, gameType: string, spectate?: boolean) => void;
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
  canWatchAd?: boolean;
  bonusAmount?: number;
  isBailout?: boolean;
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [adState, setAdState] = useState<{
    open: boolean;
    sessionId: string | null;
    purpose: "daily_bonus_double" | "bailout_upgrade" | "reward_ad";
    pendingBonus: BonusModal | null;
  }>({ open: false, sessionId: null, purpose: "daily_bonus_double", pendingBonus: null });
  const interstitial = useInterstitial();
  const prevSelectedGame = useRef<string | null>(null);

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
    // Interstitial on game switch (not on first pick)
    if (prevSelectedGame.current !== null && prevSelectedGame.current !== value && interstitial.checkTransition()) {
      interstitial.show();
    }
    prevSelectedGame.current = value;
    setSelectedGame(value);
  };

  const backToGames = () => {
    play("button_click");
    setSelectedGame(null);
  };

  const claimDailyBonus = async () => {
    play("button_click");
    try {
      const result = await apiPost<{
        coins: number;
        bonus: number;
        daily_streak: number;
        daily_streak_max: number;
        can_watch_ad?: boolean;
      }>("/api/daily-bonus", {});
      const prev = profile?.coins ?? 0;
      onCoinsChanged(result.coins, result.coins - prev);
      const nextDay = result.daily_streak >= result.daily_streak_max ? 1 : result.daily_streak + 1;
      const nextBonus = nextDay >= 7 ? 500 : 100 + (nextDay - 1) * 50;
      setBonus({
        title: t("dailyStreak.title"),
        amount: result.bonus,
        msg: `${t("dailyStreak.day", { n: result.daily_streak })} / ${result.daily_streak_max} — ${t("dailyStreak.next", { amount: nextBonus })}`,
        canWatchAd: result.can_watch_ad ?? false,
        bonusAmount: result.bonus,
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
      alert(e instanceof ApiError ? t(`errors.${e.code}`, e.params) : t("common.failed"));
    }
  };

  const claimBailout = async () => {
    play("button_click");
    try {
      const result = await apiPost<{ coins: number; bailout: number; can_watch_ad?: boolean }>(
        "/api/bailout",
        {},
      );
      const prev = profile?.coins ?? 0;
      onCoinsChanged(result.coins, result.coins - prev);
      setBonus({
        title: t("lobby.bailoutTitle"),
        amount: result.bailout,
        msg: t("lobby.bailoutMsg"),
        canWatchAd: result.can_watch_ad ?? false,
        isBailout: true,
      });
      play("bonus");
      await refreshProfile();
    } catch (e) {
      alert(e instanceof ApiError ? t(`errors.${e.code}`, e.params) : t("common.failed"));
    }
  };

  const startAdSession = async (purpose: "daily_bonus_double" | "bailout_upgrade" | "reward_ad", bonusAmount: number) => {
    play("button_click");
    try {
      const result = await apiPost<{ ad_session_id: string }>(
        `/api/ad/start?purpose=${purpose}&bonus_amount=${bonusAmount}`,
        {},
      );
      setAdState({
        open: true,
        sessionId: result.ad_session_id,
        purpose,
        pendingBonus: bonus,
      });
      setBonus(null);
    } catch (e) {
      alert(e instanceof ApiError ? t(`errors.${e.code}`, e.params) : t("common.failed"));
    }
  };

  const onAdComplete = async (result: { coins: number; reward: number }) => {
    const prev = profile?.coins ?? 0;
    onCoinsChanged(result.coins, result.coins - prev);
    setAdState({ open: false, sessionId: null, purpose: "daily_bonus_double", pendingBonus: null });
    play("bonus");
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.55 },
      colors: ["#f4c430", "#ffd84a", "#c41e3a", "#ffffff"],
    });
    await refreshProfile();
  };

  const onAdCancel = () => {
    setAdState((prev) => {
      if (prev.pendingBonus) setBonus(prev.pendingBonus);
      return { open: false, sessionId: null, purpose: "daily_bonus_double", pendingBonus: null };
    });
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
          {t("lobby.dailyBonus")}
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const last = profile?.last_daily_bonus?.slice(0, 10);
            return last !== today ? <span className="notify-dot" /> : null;
          })()}
        </button>
        <button className="btn-secondary" style={{ position: "relative" }} onClick={claimBailout}>
          {t("lobby.bailout")}
          {profile?.coins !== undefined && profile.coins < 100 && (
            <span className="notify-dot" />
          )}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            play("button_click");
            setShowLeaderboard(true);
          }}
        >
          {t("leaderboard.title")}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            play("button_click");
            setShowAchievements(true);
          }}
        >
          {t("achievements.title")}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            play("button_click");
            setShowShop(true);
          }}
        >
          {t("shop.title")}
        </button>
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          const watches = profile?.last_ad_date?.slice(0, 10) === today
            ? (profile?.ad_watches_today ?? 0)
            : 0;
          const remaining = AD_REWARD_DAILY_CAP - watches;
          return (
            <button
              className="btn-secondary"
              style={{ position: "relative" }}
              disabled={remaining <= 0}
              onClick={() => startAdSession("reward_ad", 0)}
            >
              {t("ads.watchForCoins")}
              {remaining > 0 && <span className="notify-dot" />}
              <span style={{ display: "block", fontSize: "0.7rem", opacity: 0.7 }}>
                {remaining > 0
                  ? t("ads.remaining", { n: remaining })
                  : t("ads.dailyCap")}
              </span>
            </button>
          );
        })()}
        <button className="btn-danger" onClick={logout}>
          {t("lobby.logout")}
        </button>
      </div>

      {selectedGame === null ? (
        <>
          {profile?.game_stats && Object.keys(profile.game_stats).length > 0 && (
            <div className="stats-section">
              <h3>{t("stats.title")}</h3>
              <div className="stats-grid">
                {SUPPORTED_GAMES.map((g) => {
                  const gs: GameStatsEntry | undefined = profile.game_stats?.[g.value];
                  if (!gs || gs.hands_played === 0) return null;
                  const winRate = gs.hands_played > 0
                    ? Math.round((gs.wins / gs.hands_played) * 100)
                    : 0;
                  return (
                    <div key={g.value} className="stats-card">
                      <div className="stats-card-title">
                        {g.icon} {t(`games.${g.value}.label`)}
                      </div>
                      <div className="stats-card-row">
                        <span>{t("stats.handsPlayed")}</span>
                        <span>{gs.hands_played}</span>
                      </div>
                      <div className="stats-card-row">
                        <span>{t("stats.winRate")}</span>
                        <span>{winRate}% ({gs.wins}W / {gs.losses}L / {gs.draws}D)</span>
                      </div>
                      <div className="stats-card-row">
                        <span>{t("stats.totalWagered")}</span>
                        <span>{gs.total_wagered.toLocaleString()}</span>
                      </div>
                      <div className="stats-card-row">
                        <span>{t("stats.netProfit")}</span>
                        <span style={{ color: gs.total_won - gs.total_wagered >= 0 ? "var(--success)" : "var(--danger)" }}>
                          {(gs.total_won - gs.total_wagered).toLocaleString()}
                        </span>
                      </div>
                      <div className="stats-card-row">
                        <span>{t("stats.biggestWin")}</span>
                        <span style={{ color: "var(--gold)" }}>{gs.biggest_win.toLocaleString()}</span>
                      </div>
                      {(profile.best_streaks?.[g.value] ?? 0) > 0 && (
                        <div className="stats-card-row">
                          <span>{t("stats.bestStreak")}</span>
                          <span>{profile.best_streaks![g.value]}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Challenges onCoinsChanged={onCoinsChanged} play={play} />

          <h3>{t("lobby.chooseGame")}</h3>
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
                  {tables.some(
                    (tbl) =>
                      (tbl.game_type ?? "blackjack") === g.value &&
                      tbl.player_count > 0,
                  ) && <span className="notify-dot" />}
                  <div className="game-card-icon">{g.icon}</div>
                  <div className="game-card-title">
                    {t(`games.${g.value}.label`)}
                  </div>
                  <div className="game-card-tagline">
                    {t(`games.${g.value}.tagline`)}
                  </div>
                  <div className="game-card-meta">{t("lobby.tablesOpen", { n: tableCount })}</div>
                </button>
              );
            })}
          </div>

          <BannerAd size="mrec" />
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
                        {t("lobby.seats", { n: tbl.player_count, max: tbl.max_players })}
                      </span>
                      <span className="pill">{t("lobby.minBet", { n: tbl.min_bet })}</span>
                      <span className="pill">{t(`phase.${gameType}.${tbl.status}`)}</span>
                    </div>
                  </div>
                  <div className="table-buttons">
                    {tbl.player_count > 0 && (
                      <button
                        className="btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          play("button_click");
                          onJoinTable(tbl.table_id, gameType, true);
                        }}
                      >
                        {t("lobby.watch")}
                      </button>
                    )}
                    <button className="btn-primary" disabled={isFull} style={{ position: "relative" }}>
                      {isFull ? t("lobby.full") : t("lobby.join")}
                      {!isFull && tbl.player_count > 0 && <span className="notify-dot" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      <BannerAd size="standard" className="ad-anchor-bottom" />

      <InterstitialAd open={interstitial.shouldShow} onClose={interstitial.onDismiss} />

      <Leaderboard
        open={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
      <AchievementList
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
      />
      <Shop
        open={showShop}
        onClose={() => setShowShop(false)}
        onCoinsChanged={onCoinsChanged}
        play={play}
      />
      <AdPlayer
        open={adState.open}
        adSessionId={adState.sessionId}
        onComplete={onAdComplete}
        onCancel={onAdCancel}
      />

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
              {bonus.canWatchAd && (
                <button
                  className="btn-secondary"
                  style={{ marginBottom: "0.5rem" }}
                  onClick={() =>
                    startAdSession(
                      bonus.isBailout ? "bailout_upgrade" : "daily_bonus_double",
                      bonus.bonusAmount ?? bonus.amount,
                    )
                  }
                >
                  {bonus.isBailout ? t("ads.watchForMore") : t("ads.watchToDouble")}
                </button>
              )}
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

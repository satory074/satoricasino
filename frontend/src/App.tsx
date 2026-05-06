import { useCallback, useEffect, useRef, useState } from "react";
import { Auth } from "./auth/Auth";
import { Lobby } from "./lobby/Lobby";
import { GameRouter } from "./games/GameRouter";
import { useAudio } from "./shared/audio/useAudio";
import { clearAuth, getDisplayName, getToken } from "./shared/api/api";
import { StreakBadge } from "./shared/components/StreakBadge";
import { LangToggle } from "./shared/components/LangToggle";
import { useTranslation } from "./shared/i18n/useTranslation";
import type { UserProfile } from "./shared/types/game";
import { getTableThemeClass } from "./shared/cosmetics";
import clsx from "clsx";

type View = "auth" | "lobby" | "game";

export default function App() {
  const [view, setView] = useState<View>(() => (getToken() ? "lobby" : "auth"));
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableGameType, setTableGameType] = useState<string>("blackjack");
  const [spectateMode, setSpectateMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [coinFlash, setCoinFlash] = useState<"up" | "down" | null>(null);
  const [shownCoins, setShownCoins] = useState<number>(0);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const streaksInitialized = useRef(false);
  const tableGameTypeRef = useRef(tableGameType);
  tableGameTypeRef.current = tableGameType;
  const { muted, bgmOn, toggleMute, toggleBgm, play } = useAudio();
  const { t } = useTranslation();

  // Initialize streaks from server profile on first load
  useEffect(() => {
    if (profile?.streaks && !streaksInitialized.current) {
      streaksInitialized.current = true;
      setStreaks(profile.streaks);
    }
  }, [profile?.streaks]);

  // Coin counter animation
  useEffect(() => {
    const target = profile?.coins ?? 0;
    if (shownCoins === target) return;
    const start = shownCoins;
    const startTime = performance.now();
    const dur = 700;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(start + (target - start) * eased);
      setShownCoins(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [profile?.coins]);

  const onCoinsChanged = useCallback((coins: number, delta: number) => {
    setProfile((p) => (p ? { ...p, coins } : p));
    if (delta > 0) {
      setCoinFlash("up");
      window.setTimeout(() => setCoinFlash(null), 700);
    } else if (delta < 0) {
      setCoinFlash("down");
      window.setTimeout(() => setCoinFlash(null), 500);
    }
  }, []);

  const onResolve = useCallback(
    (delta: number) => {
      if (!profile) return;
      onCoinsChanged(profile.coins + delta, delta);
      // Bump local stats counter optimistically (server will reconcile)
      setProfile((p) =>
        p
          ? {
              ...p,
              wins: delta > 0 ? p.wins + 1 : p.wins,
              losses: delta < 0 ? p.losses + 1 : p.losses,
              draws: delta === 0 ? p.draws + 1 : p.draws,
            }
          : p,
      );
      // Per-game win streak: increment on win, reset on loss, leave on push.
      const game = tableGameTypeRef.current;
      setStreaks((prev) => {
        if (delta > 0) return { ...prev, [game]: (prev[game] ?? 0) + 1 };
        if (delta < 0) return { ...prev, [game]: 0 };
        return prev;
      });
    },
    [profile, onCoinsChanged],
  );

  const onJoinTable = useCallback((id: string, gameType: string, spectate = false) => {
    setTableId(id);
    setTableGameType(gameType);
    setSpectateMode(spectate);
    setView("game");
  }, []);

  const onLeaveTable = useCallback(() => {
    setTableId(null);
    setSpectateMode(false);
    setView("lobby");
  }, []);

  const onLogout = useCallback(() => {
    clearAuth();
    setProfile(null);
    setView("auth");
  }, []);

  const playClick = useCallback(() => play("button_click"), [play]);

  const isAuth = view === "auth";

  return (
    <>
      {!isAuth && (
        <header className="app-header">
          <div className="app-logo">SatoriCasino</div>
          <div className="user-info">
            {profile?.level && profile.level > 1 && (
              <span className="level-badge" title={`XP: ${profile.xp ?? 0}`}>
                Lv.{profile.level}
              </span>
            )}
            <span className="user-name">{getDisplayName() ?? "—"}</span>
            <span
              className={clsx(
                "coin-display",
                coinFlash === "up" && "flash-up",
                coinFlash === "down" && "flash-down",
              )}
              title="Coins"
            >
              <span style={{ color: "var(--gold)" }}>◉</span>
              <span>{shownCoins.toLocaleString()}</span>
            </span>
            {profile && (
              <span className="user-stats">
                {profile.wins}W / {profile.losses}L / {profile.draws}D
              </span>
            )}
            {view === "game" && (
              <StreakBadge streak={streaks[tableGameType] ?? 0} />
            )}
            <button
              className="mute-btn audio-mute"
              onClick={toggleMute}
              title={muted ? t("header.unmute") : t("header.mute")}
              aria-label={muted ? t("header.unmute") : t("header.mute")}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              className="mute-btn audio-bgm"
              onClick={toggleBgm}
              title={bgmOn ? t("header.bgmOff") : t("header.bgmOn")}
              aria-label={bgmOn ? t("header.bgmOff") : t("header.bgmOn")}
            >
              {bgmOn ? "♪" : "♩"}
            </button>
            <span className="lang-toggle">
              <LangToggle />
            </span>
          </div>
        </header>
      )}

      {view === "auth" && <Auth onAuthed={() => setView("lobby")} playClick={playClick} />}
      {view === "lobby" && (
        <Lobby
          onJoinTable={onJoinTable}
          onLogout={onLogout}
          onCoinsChanged={onCoinsChanged}
          profile={profile}
          setProfile={setProfile}
          play={play}
        />
      )}
      {view === "game" && tableId && (
        <GameRouter
          gameType={tableGameType}
          tableId={tableId}
          onLeave={onLeaveTable}
          myCoins={profile?.coins ?? 0}
          onResolve={onResolve}
          play={play}
          spectate={spectateMode}
          tableThemeClass={getTableThemeClass(profile?.equipped)}
        />
      )}
    </>
  );
}

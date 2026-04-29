import { useCallback, useEffect, useState } from "react";
import { Auth } from "./auth/Auth";
import { Lobby } from "./lobby/Lobby";
import { Game } from "./game/Game";
import { useAudio } from "./audio/useAudio";
import { clearAuth, getDisplayName, getToken } from "./api/api";
import type { UserProfile } from "./types/game";
import clsx from "clsx";

type View = "auth" | "lobby" | "game";

export default function App() {
  const [view, setView] = useState<View>(() => (getToken() ? "lobby" : "auth"));
  const [tableId, setTableId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [coinFlash, setCoinFlash] = useState<"up" | "down" | null>(null);
  const [shownCoins, setShownCoins] = useState<number>(0);
  const { muted, bgmOn, toggleMute, toggleBgm, play } = useAudio();

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
    },
    [profile, onCoinsChanged],
  );

  const onJoinTable = useCallback((id: string) => {
    setTableId(id);
    setView("game");
  }, []);

  const onLeaveTable = useCallback(() => {
    setTableId(null);
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
            <button
              className="mute-btn"
              onClick={toggleMute}
              title={muted ? "Unmute" : "Mute"}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              className="mute-btn"
              onClick={toggleBgm}
              title={bgmOn ? "BGM off" : "BGM on"}
              aria-label="Toggle BGM"
            >
              {bgmOn ? "♪" : "♩"}
            </button>
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
        <Game
          tableId={tableId}
          onLeave={onLeaveTable}
          myCoins={profile?.coins ?? 0}
          onResolve={onResolve}
          play={play}
        />
      )}
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Auth } from "./auth/Auth";
import { Lobby } from "./lobby/Lobby";
import { GameRouter } from "./games/GameRouter";
import { InfoPage } from "./info/InfoPage";
import { useAudio } from "./shared/audio/useAudio";
import { clearAuth, getDisplayName, getToken } from "./shared/api/api";
import { StreakBadge } from "./shared/components/StreakBadge";
import { UserMenu } from "./shared/components/UserMenu";
import { InterstitialAd } from "./shared/components/InterstitialAd";
import { SideAds } from "./shared/components/SideAds";
import { ToastHost } from "./shared/components/Toast";
import { useInterstitial } from "./shared/hooks/useInterstitial";
import { useTranslation } from "./shared/i18n/useTranslation";
import type { UserProfile } from "./shared/types/game";
import { getTableThemeClass } from "./shared/cosmetics";
import clsx from "clsx";

type InfoView =
  | "info-privacy"
  | "info-terms"
  | "info-about"
  | "info-responsible"
  | "info-blackjack-guide"
  | "info-chinchiro-guide"
  | "info-faq"
  | "info-getting-started"
  | "info-glossary"
  | "info-contact";

type View = "auth" | "lobby" | "game" | InfoView;

const INFO_PATHS: Record<string, InfoView> = {
  "/privacy": "info-privacy",
  "/terms": "info-terms",
  "/about": "info-about",
  "/responsible-gaming": "info-responsible",
  "/games/blackjack": "info-blackjack-guide",
  "/games/chinchiro": "info-chinchiro-guide",
  "/faq": "info-faq",
  "/getting-started": "info-getting-started",
  "/glossary": "info-glossary",
  "/contact": "info-contact",
};

const PATH_FOR_VIEW: Record<View, string> = {
  auth: "/",
  lobby: "/",
  game: "/",
  "info-privacy": "/privacy",
  "info-terms": "/terms",
  "info-about": "/about",
  "info-responsible": "/responsible-gaming",
  "info-blackjack-guide": "/games/blackjack",
  "info-chinchiro-guide": "/games/chinchiro",
  "info-faq": "/faq",
  "info-getting-started": "/getting-started",
  "info-glossary": "/glossary",
  "info-contact": "/contact",
};

// Maps each view to its `seo.titles.*` / `seo.descriptions.*` i18n key so the
// document <title> + meta description can be set per route (helps crawlers
// distinguish the public pages).
const SEO_KEY_FOR_VIEW: Record<View, string> = {
  auth: "home",
  lobby: "lobby",
  game: "game",
  "info-privacy": "privacy",
  "info-terms": "terms",
  "info-about": "about",
  "info-responsible": "responsible",
  "info-blackjack-guide": "blackjackGuide",
  "info-chinchiro-guide": "chinchiroGuide",
  "info-faq": "faq",
  "info-getting-started": "gettingStarted",
  "info-glossary": "glossary",
  "info-contact": "contact",
};

function isInfoView(v: View): v is InfoView {
  return v.startsWith("info-");
}

function initialView(): View {
  if (typeof window === "undefined") return getToken() ? "lobby" : "auth";
  const fromPath = INFO_PATHS[window.location.pathname];
  if (fromPath) return fromPath;
  return getToken() ? "lobby" : "auth";
}

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableGameType, setTableGameType] = useState<string>("blackjack");
  const [spectateMode, setSpectateMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [coinFlash, setCoinFlash] = useState<"up" | "down" | null>(null);
  const [shownCoins, setShownCoins] = useState<number>(0);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [adsReady, setAdsReady] = useState(false);
  const streaksInitialized = useRef(false);
  const tableGameTypeRef = useRef(tableGameType);
  tableGameTypeRef.current = tableGameType;
  const { muted, bgmOn, toggleMute, toggleBgm, play } = useAudio();
  const { t, lang } = useTranslation();
  const leaveInterstitial = useInterstitial();

  // Initialize streaks from server profile on first load
  useEffect(() => {
    if (profile?.streaks && !streaksInitialized.current) {
      streaksInitialized.current = true;
      setStreaks(profile.streaks);
    }
  }, [profile?.streaks]);

  // Sync browser URL with the current view so direct links + back/forward work.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = PATH_FOR_VIEW[view];
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [view]);

  // Reset "ads can show" on every view change. Children will signal ready
  // once real publisher content is on screen (lobby tables loaded, game state arrived).
  useEffect(() => {
    setAdsReady(false);
  }, [view]);

  // Per-view document title + meta description, so each crawlable route has a
  // unique, descriptive head. Updates the existing <meta name="description">
  // (added in index.html) rather than creating new tags.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const key = SEO_KEY_FOR_VIEW[view];
    document.title = t(`seo.titles.${key}`);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t(`seo.descriptions.${key}`));
  }, [view, lang, t]);

  // AdSense Auto Ads gate. Publisher-policy 11112688 forbids ads on screens
  // without publisher content: login (auth), static info pages, and any
  // loading state (lobby fetching tables, game waiting on WS state).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldPause =
      view === "auth" || view.startsWith("info-") || !adsReady;
    const ads = ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []);
    try {
      ads.push({ pauseAdRequests: shouldPause ? 1 : 0 });
    } catch {
      // AdSense throws TagError if a re-fill walk hits already-filled slots.
      // The pause/resume signal is still recorded — non-fatal.
    }
    if (shouldPause) {
      document
        .querySelectorAll("body > ins.adsbygoogle, body > iframe[id^='google_ads_iframe'], body > div[id^='google_ads_']")
        .forEach((el) => el.remove());
    }
  }, [view, adsReady]);

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
    if (leaveInterstitial.checkTransition()) {
      leaveInterstitial.show();
    }
    setTableId(null);
    setSpectateMode(false);
    setView("lobby");
  }, [leaveInterstitial]);

  const onLogout = useCallback(() => {
    clearAuth();
    setProfile(null);
    setView("auth");
  }, []);

  const onContentReady = useCallback(() => {
    setAdsReady(true);
  }, []);

  const navigateInfo = useCallback((target: InfoView) => {
    setView(target);
  }, []);

  const navigateHome = useCallback(() => {
    setView(getToken() ? "lobby" : "auth");
  }, []);

  const playClick = useCallback(() => play("button_click"), [play]);

  if (view === "auth") {
    return <Auth onAuthed={() => setView("lobby")} playClick={playClick} onNavigate={navigateInfo} />;
  }

  if (isInfoView(view)) {
    return <InfoPage view={view} onClose={navigateHome} onNavigate={navigateInfo} />;
  }

  return (
    <SideAds ready={adsReady}>
      <header className="app-header">
        <div className="app-logo">SatoriCasino</div>
        <div className="user-info">
          {view === "game" && (
            <StreakBadge streak={streaks[tableGameType] ?? 0} />
          )}
          <span
            className={clsx(
              "coin-display",
              coinFlash === "up" && "flash-up",
              coinFlash === "down" && "flash-down",
            )}
            title={t("header.coinsLabel")}
          >
            <span className="coin-icon" aria-hidden="true">
              ◉
            </span>
            <span className="num">{shownCoins.toLocaleString()}</span>
          </span>
          <UserMenu
            displayName={getDisplayName() ?? "—"}
            profile={profile}
            muted={muted}
            bgmOn={bgmOn}
            toggleMute={toggleMute}
            toggleBgm={toggleBgm}
            onLogout={onLogout}
            playClick={playClick}
          />
        </div>
      </header>

      {view === "lobby" && (
        <Lobby
          onJoinTable={onJoinTable}
          onLogout={onLogout}
          onCoinsChanged={onCoinsChanged}
          profile={profile}
          setProfile={setProfile}
          play={play}
          onContentReady={onContentReady}
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
          onContentReady={onContentReady}
        />
      )}

      <InterstitialAd open={leaveInterstitial.shouldShow} onClose={leaveInterstitial.onDismiss} />

      <ToastHost />
    </SideAds>
  );
}

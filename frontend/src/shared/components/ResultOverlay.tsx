import { useEffect, useRef, useState } from "react";
import type { Result } from "../types/game";
import { useTranslation } from "../i18n/useTranslation";
import { play, setBgmTension, decayBgmTension } from "../audio/sounds";

export type ResultKind =
  | Result
  | "near_miss"
  | "bust"
  | "pinzoro"
  | "arashi"
  | "shigoro"
  | "hifumi"
  | "menashi"
  | "wakare";

type RevealPhase = "anticipation" | "reveal" | "afterglow";
type WinTier = "normal" | "big" | "mega";

interface NearMissDetail {
  // Gap in points/value units (1 = "off by one", 2 = "off by two")
  gap: number;
  // Source of the near-miss for picking the right copy
  reason: "byOne" | "byPoint" | "busted22";
}

interface Props {
  shown: ResultKind | null;
  amount: number | null;
  nearMissDetail?: NearMissDetail | null;
  onReveal?: () => void;
  onComplete?: () => void;
}

const RIM_GLOW_KINDS: ResultKind[] = ["blackjack", "win", "pinzoro", "arashi", "shigoro"];
const POSITIVE_AMOUNT_KINDS: ResultKind[] = [
  "win",
  "blackjack",
  "pinzoro",
  "arashi",
  "shigoro",
];
const ZONE_KINDS: ResultKind[] = ["pinzoro", "blackjack", "arashi"];

interface Timing {
  anticipation: number;
  reveal: number;
  afterglow: number;
}

function winTier(amount: number | null | undefined): WinTier {
  const a = Math.abs(amount ?? 0);
  if (a >= 500) return "mega";
  if (a >= 200) return "big";
  return "normal";
}

function getTiming(kind: ResultKind, amount?: number | null): Timing {
  switch (kind) {
    case "pinzoro":
      return { anticipation: 800, reveal: 600, afterglow: 2000 };
    case "blackjack":
    case "arashi":
      return { anticipation: 600, reveal: 500, afterglow: 1600 };
    case "win":
    case "shigoro": {
      const tier = winTier(amount);
      if (tier === "mega")
        return { anticipation: 720, reveal: 600, afterglow: 2000 };
      if (tier === "big")
        return { anticipation: 600, reveal: 520, afterglow: 1600 };
      return { anticipation: 450, reveal: 470, afterglow: 1300 };
    }
    case "push":
    case "wakare":
      return { anticipation: 0, reveal: 300, afterglow: 800 };
    case "near_miss":
      // Responsible-gaming: a near-miss is a LOSS. We do not dramatize it with
      // anticipation/tension (that's the classic "losses disguised as wins"
      // dark pattern). Same short, quiet timing as any other loss.
      return { anticipation: 0, reveal: 300, afterglow: 700 };
    default:
      return { anticipation: 150, reveal: 300, afterglow: 700 };
  }
}

function getOrbColor(kind: ResultKind): string {
  if (POSITIVE_AMOUNT_KINDS.includes(kind)) return "var(--gold)";
  if (kind === "push" || kind === "wakare") return "var(--info)";
  if (kind === "near_miss") return "var(--red)";
  return "var(--text-low)";
}

function getTextClass(kind: ResultKind): string {
  if (kind === "lose" || kind === "bust" || kind === "menashi") return "lose";
  if (kind === "push" || kind === "wakare") return "push";
  if (kind === "near_miss" || kind === "hifumi") return "near-miss";
  if (kind === "pinzoro") return "pinzoro";
  return "";
}

function tensionForKind(kind: ResultKind): 0 | 1 | 2 | 3 {
  if (kind === "pinzoro") return 3;
  if (kind === "blackjack" || kind === "arashi") return 2;
  if (kind === "win" || kind === "shigoro") return 1;
  // near_miss is a loss — no BGM tension swell.
  return 0;
}

export function ResultOverlay({ shown, amount, nearMissDetail, onReveal, onComplete }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<RevealPhase | null>(null);
  const [countedAmount, setCountedAmount] = useState(0);
  const timersRef = useRef<number[]>([]);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Phase machine — driven by `shown` transitions
  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setCountedAmount(0);

    if (!shown) {
      setPhase(null);
      return;
    }

    const timing = getTiming(shown, amount);
    const tensionLevel = tensionForKind(shown);
    const timers: number[] = [];
    let offset = 0;

    if (timing.anticipation > 0) {
      setPhase("anticipation");
      // Crank BGM tension during anticipation so the moment swells
      if (tensionLevel > 0) setBgmTension(tensionLevel);
      offset = timing.anticipation;
      timers.push(
        window.setTimeout(() => {
          setPhase("reveal");
          onRevealRef.current?.();
        }, offset),
      );
    } else {
      setPhase("reveal");
      timers.push(window.setTimeout(() => onRevealRef.current?.(), 0));
    }

    timers.push(
      window.setTimeout(() => {
        setPhase("afterglow");
      }, offset + timing.reveal),
    );

    timers.push(
      window.setTimeout(() => {
        onCompleteRef.current?.();
        // Let BGM relax shortly after the overlay completes
        if (tensionLevel > 0) decayBgmTension(200);
      }, offset + timing.reveal + timing.afterglow),
    );

    timersRef.current = timers;
    return () => {
      timers.forEach(clearTimeout);
    };
    // amount intentionally excluded — reanimating on count-up tick would reset phase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  // Count-up animation during afterglow — bet-tier-aware: bigger bets get longer,
  // more dramatic count-ups with audible tick SFX every step.
  useEffect(() => {
    if (phase !== "afterglow" || amount == null || amount === 0) return;
    const target = amount;
    const absTarget = Math.abs(target);
    const tier = winTier(target);
    const timing = shown ? getTiming(shown, amount) : null;

    // Mega/big wins use a longer count-up with more steps; losses stay quick.
    const isPositive = target > 0;
    const fraction = isPositive
      ? tier === "mega"
        ? 0.85
        : tier === "big"
          ? 0.7
          : 0.55
      : 0.45;
    const countDuration = (timing?.afterglow ?? 1000) * fraction;
    const maxSteps = isPositive ? (tier === "mega" ? 60 : tier === "big" ? 45 : 28) : 20;
    const stepCount = Math.min(maxSteps, Math.max(1, absTarget));
    const stepInterval = Math.max(28, countDuration / stepCount);

    // Tick SFX cadence: every step for normal, every 2nd for big, every 3rd for mega
    // (avoids overwhelming the mix on long count-ups while still giving rhythmic feedback)
    const tickEvery = isPositive ? (tier === "mega" ? 3 : tier === "big" ? 2 : 1) : 0;

    let step = 0;
    const id = setInterval(() => {
      step++;
      if (step >= stepCount) {
        setCountedAmount(target);
        clearInterval(id);
        return;
      }
      setCountedAmount(Math.round(target * (step / stepCount)));
      if (tickEvery > 0 && step % tickEvery === 0) {
        // Pitch climbs slightly toward the end so the count-up feels like it lands
        const pitchShift = Math.round((step / stepCount) * 220);
        play("count_up", { pitchShift });
      }
    }, stepInterval);
    return () => clearInterval(id);
  }, [phase, amount, shown]);

  if (!shown || !phase) return null;

  const orbColor = getOrbColor(shown);
  const textClass = getTextClass(shown);
  const isPositive =
    amount != null && amount > 0 && POSITIVE_AMOUNT_KINDS.includes(shown);
  const isNegative = amount != null && amount < 0;
  const showAmount = isPositive || isNegative;
  const timing = getTiming(shown, amount);
  const tier = winTier(amount);
  const isZone = ZONE_KINDS.includes(shown);
  const isNearMiss = shown === "near_miss";

  // Resolve near-miss subtitle (only when overlay is in reveal/afterglow)
  let nearMissSubtitle: string | null = null;
  if (isNearMiss && nearMissDetail) {
    const key = `results.nearMissDetail.${nearMissDetail.reason}`;
    nearMissSubtitle = t(key, { n: nearMissDetail.gap });
  }

  return (
    <>
      {/* Screen-reader announcement of the outcome. The visual reveal is purely
          decorative (color + animated text), so without this AT users get no
          result. Announced once when the reveal phase begins. */}
      {phase === "reveal" && (
        <div className="sr-only" role="status" aria-live="polite">
          {t(`results.${shown}`)}
          {showAmount ? ` ${isPositive ? "+" : ""}${amount?.toLocaleString()}` : ""}
        </div>
      )}

      {/* Zone overlay — jackpot-class anticipation backdrop with golden rays */}
      {phase === "anticipation" && isZone && (
        <div className={`zone-overlay zone-${shown}`}>
          <div className="zone-rays" aria-hidden />
          <div className="zone-pulse" aria-hidden />
          <div className="sparkle-field" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className={`sparkle sparkle-${i}`} />
            ))}
          </div>
        </div>
      )}

      {/* Dark backdrop during anticipation */}
      {phase === "anticipation" && (
        <>
          <div
            className={`result-backdrop${isNearMiss ? " near-miss-flash" : ""}`}
          />
          <div className="result-overlay">
            <div
              className={`anticipation-orb${isNearMiss ? " near-miss" : ""}`}
              style={
                { "--orb-color": orbColor } as React.CSSProperties
              }
            />
          </div>
        </>
      )}

      {/* Rim glow during reveal/afterglow */}
      {(phase === "reveal" || phase === "afterglow") &&
        RIM_GLOW_KINDS.includes(shown) && (
          <div
            className={`result-rim-glow${phase === "afterglow" ? " rim-fading" : ""}${
              tier === "mega" ? " rim-mega" : ""
            }`}
          />
        )}

      {/* Main text during reveal/afterglow */}
      {(phase === "reveal" || phase === "afterglow") && (
        <div className={`result-overlay ${shown}`}>
          <div
            className={`result-overlay-text ${textClass} ${
              phase === "reveal" ? "reveal-enter" : "afterglow-fade"
            }${tier === "mega" ? " is-mega" : tier === "big" ? " is-big" : ""}`}
            style={
              phase === "afterglow"
                ? ({
                    "--afterglow-dur": `${timing.afterglow}ms`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            {t(`results.${shown}`)}
            {phase === "afterglow" && showAmount && (
              <span
                className={`result-amount${isNegative ? " loss" : ""} amount-pop${
                  tier === "mega" ? " amount-mega" : ""
                }`}
              >
                {isPositive ? "+" : ""}
                {countedAmount.toLocaleString()}
              </span>
            )}
            {nearMissSubtitle && (
              <span className="result-near-miss-detail">{nearMissSubtitle}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import type { Result } from "../types/game";
import { useTranslation } from "../i18n/useTranslation";

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

interface Props {
  shown: ResultKind | null;
  amount: number | null;
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

interface Timing {
  anticipation: number;
  reveal: number;
  afterglow: number;
}

function getTiming(kind: ResultKind): Timing {
  switch (kind) {
    case "pinzoro":
      return { anticipation: 800, reveal: 600, afterglow: 2000 };
    case "blackjack":
    case "arashi":
      return { anticipation: 600, reveal: 500, afterglow: 1600 };
    case "win":
    case "shigoro":
      return { anticipation: 400, reveal: 450, afterglow: 1200 };
    case "push":
    case "wakare":
      return { anticipation: 0, reveal: 300, afterglow: 800 };
    case "near_miss":
      return { anticipation: 500, reveal: 400, afterglow: 1000 };
    default:
      return { anticipation: 150, reveal: 300, afterglow: 700 };
  }
}

function getOrbColor(kind: ResultKind): string {
  if (POSITIVE_AMOUNT_KINDS.includes(kind)) return "var(--gold)";
  if (kind === "push" || kind === "wakare") return "var(--neon)";
  if (kind === "near_miss") return "var(--crimson)";
  return "#888";
}

function getTextClass(kind: ResultKind): string {
  if (kind === "lose" || kind === "bust" || kind === "menashi") return "lose";
  if (kind === "push" || kind === "wakare") return "push";
  if (kind === "near_miss" || kind === "hifumi") return "near-miss";
  if (kind === "pinzoro") return "pinzoro";
  return "";
}

export function ResultOverlay({ shown, amount, onReveal, onComplete }: Props) {
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

    const timing = getTiming(shown);
    const timers: number[] = [];
    let offset = 0;

    if (timing.anticipation > 0) {
      setPhase("anticipation");
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
      }, offset + timing.reveal + timing.afterglow),
    );

    timersRef.current = timers;
    return () => timers.forEach(clearTimeout);
  }, [shown]);

  // Count-up animation during afterglow
  useEffect(() => {
    if (phase !== "afterglow" || amount == null || amount === 0) return;
    const target = amount;
    const absTarget = Math.abs(target);
    const timing = shown ? getTiming(shown) : null;
    const countDuration = (timing?.afterglow ?? 1000) * 0.5;
    const stepCount = Math.min(20, Math.max(1, absTarget));
    const stepInterval = Math.max(30, countDuration / stepCount);
    let step = 0;
    const id = setInterval(() => {
      step++;
      if (step >= stepCount) {
        setCountedAmount(target);
        clearInterval(id);
      } else {
        setCountedAmount(Math.round(target * (step / stepCount)));
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
  const timing = getTiming(shown);

  return (
    <>
      {/* Dark backdrop during anticipation */}
      {phase === "anticipation" && (
        <>
          <div className="result-backdrop" />
          <div className="result-overlay">
            <div
              className="anticipation-orb"
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
            className={`result-rim-glow${phase === "afterglow" ? " rim-fading" : ""}`}
          />
        )}

      {/* Main text during reveal/afterglow */}
      {(phase === "reveal" || phase === "afterglow") && (
        <div className={`result-overlay ${shown}`}>
          <div
            className={`result-overlay-text ${textClass} ${
              phase === "reveal" ? "reveal-enter" : "afterglow-fade"
            }`}
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
                className={`result-amount${isNegative ? " loss" : ""} amount-pop`}
              >
                {isPositive ? "+" : ""}
                {countedAmount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

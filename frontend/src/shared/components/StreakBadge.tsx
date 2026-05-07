import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import confetti from "canvas-confetti";
import { useTranslation } from "../i18n/useTranslation";
import { play } from "../audio/sounds";

interface Props {
  streak: number;
}

function tier(streak: number): 0 | 1 | 2 | 3 {
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}

export function StreakBadge({ streak }: Props) {
  const { t } = useTranslation();
  const [flash, setFlash] = useState(false);
  const prevTierRef = useRef<0 | 1 | 2 | 3>(tier(streak));
  const flashTimerRef = useRef<number | null>(null);

  const tr = tier(streak);

  useEffect(() => {
    const prev = prevTierRef.current;
    if (tr > prev) {
      setFlash(true);
      play("bonus");
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlash(false), 1450);
      // Tier 3 reach (streak just hit 10) — extra fireworks from the badge corner
      if (tr === 3 && prev < 3) {
        try {
          confetti({
            particleCount: 110,
            spread: 70,
            startVelocity: 45,
            origin: { x: 0.92, y: 0.12 },
            colors: ["#f4c430", "#ffd84a", "#c41e3a", "#ffffff"],
          });
        } catch {
          // canvas-confetti only fails in non-browser env — safe to ignore
        }
      }
    }
    prevTierRef.current = tr;
    return () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, [tr]);

  if (streak < 2) return null;

  return (
    <span
      className={clsx(
        "streak-badge",
        tr > 0 && `tier-${tr}`,
        flash && "streak-flash",
      )}
      title={t("streak.tooltip", { n: streak })}
    >
      <span aria-hidden>🔥</span>
      <span>{t("streak.count", { n: streak })}</span>
    </span>
  );
}

import { useEffect, useRef, useState } from "react";

interface Props {
  totalSec: number;
  resetKey: string | number;
  active: boolean;
  onTick?: (remaining: number) => void;
}

export function TurnTimer({ totalSec, resetKey, active, onTick }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(performance.now());
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    startRef.current = performance.now();
    setElapsed(0);
    let raf = 0;
    const step = () => {
      const dt = (performance.now() - startRef.current) / 1000;
      setElapsed(dt);
      onTickRef.current?.(Math.max(0, totalSec - dt));
      if (dt < totalSec) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [resetKey, active, totalSec]);

  if (!active) return null;

  const remaining = Math.max(0, totalSec - elapsed);
  const ratio = remaining / totalSec;
  const r = 14;
  const c = 2 * Math.PI * r;
  const danger = remaining <= 3;
  const color = danger ? "#ef4444" : remaining <= 10 ? "#f59e0b" : "#f4c430";

  return (
    <svg className="turn-timer" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} stroke="rgba(0,0,0,0.4)" strokeWidth="3" fill="rgba(0,0,0,0.55)" />
      <circle
        cx="18"
        cy="18"
        r={r}
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
        style={{ transition: "stroke 0.2s" }}
      />
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fill={color}
        className="turn-timer-text"
      >
        {Math.ceil(remaining)}
      </text>
    </svg>
  );
}

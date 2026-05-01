import clsx from "clsx";

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
  if (streak < 2) return null;
  const t = tier(streak);
  return (
    <span
      className={clsx("streak-badge", t > 0 && `tier-${t}`)}
      title={`${streak} 連勝中`}
    >
      <span aria-hidden>🔥</span>
      <span>{streak} 連勝</span>
    </span>
  );
}

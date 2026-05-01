import clsx from "clsx";
import { useTranslation } from "../i18n/useTranslation";

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
  if (streak < 2) return null;
  const tr = tier(streak);
  return (
    <span
      className={clsx("streak-badge", tr > 0 && `tier-${tr}`)}
      title={t("streak.tooltip", { n: streak })}
    >
      <span aria-hidden>🔥</span>
      <span>{t("streak.count", { n: streak })}</span>
    </span>
  );
}

import clsx from "clsx";
import { useTranslation } from "../i18n/useTranslation";
import type { TableHeat } from "../types/game";

interface Props {
  heat: TableHeat | null | undefined;
}

export function TableHeatBadge({ heat }: Props) {
  const { t } = useTranslation();
  if (!heat || heat.jackpots5min < 1) return null;
  const ultra = heat.ultra_hot;
  const hot = heat.hot;
  return (
    <span
      className={clsx("table-heat-badge", ultra && "ultra-hot", !ultra && hot && "hot")}
      title={t("tableHeat.jackpots", { n: heat.jackpots5min })}
    >
      <span aria-hidden>🔥</span>
      <span>{ultra ? t("tableHeat.ultraHot") : t("tableHeat.hot")}</span>
    </span>
  );
}

import { useTranslation } from "../../shared/i18n/useTranslation";
import { Bowl } from "./Bowl";
import { HandLabel } from "./HandLabel";

interface Props {
  rolls: [number, number, number][];
  hand: { name: string; eye: number } | null;
  showHand: boolean;
}

export function BankerArea({ rolls, hand, showHand }: Props) {
  const { t } = useTranslation();
  // Show the latest roll. During banker_roll phase the front-end animates each
  // by remounting Bowl with a different rollKey.
  const latest = rolls.length > 0 ? rolls[rolls.length - 1] : null;
  return (
    <div className="banker-area">
      <h3>{t("chinchiro.bankerLabel")}</h3>
      <Bowl
        dice={latest}
        rollKey={`banker-${rolls.length}`}
        size="lg"
      />
      {showHand && <HandLabel hand={hand} size="lg" />}
      {rolls.length > 0 && (
        <div className="roll-counter">
          {t("chinchiro.rollCount", { n: rolls.length })}
        </div>
      )}
    </div>
  );
}

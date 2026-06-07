import { Hand } from "../../shared/components/Hand";
import { useTranslation } from "../../shared/i18n/useTranslation";
import type { CardData, Phase } from "../../shared/types/game";

interface Props {
  cards: CardData[];
  value: number | null;
  phase: Phase;
  onCardEvent?: () => void;
  revealing?: boolean;
}

export function DealerArea({ cards, value, phase, onCardEvent, revealing }: Props) {
  const { t } = useTranslation();
  // Only show the dealer total once the dealer's hand is real (dealer turn or
  // resolution). Avoids a bare "0" badge during waiting/betting/player turns.
  const showValue =
    value != null && (phase === "dealer_turn" || phase === "resolution");
  return (
    <div className="dealer-area">
      <h3>{t("blackjack.dealerLabel")}</h3>
      <div className={`dealer-cards${revealing ? " is-revealing" : ""}`}>
        <Hand cards={cards} onCardEvent={onCardEvent} />
      </div>
      {showValue && (
        <div className="dealer-value" aria-label={t("blackjack.dealerValueLabel", { n: value! })}>
          {value}
        </div>
      )}
    </div>
  );
}

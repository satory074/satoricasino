import { Hand } from "../../shared/components/Hand";
import type { CardData, Phase } from "../../shared/types/game";

interface Props {
  cards: CardData[];
  value: number | null;
  phase: Phase;
  onCardEvent?: () => void;
  revealing?: boolean;
}

export function DealerArea({ cards, value, phase, onCardEvent, revealing }: Props) {
  const showValue =
    value != null && phase !== "player_turns" && phase !== "betting";
  return (
    <div className="dealer-area">
      <h3>Dealer</h3>
      <div className={`dealer-cards${revealing ? " is-revealing" : ""}`}>
        <Hand cards={cards} onCardEvent={onCardEvent} />
      </div>
      {showValue && <div className="dealer-value">{value}</div>}
    </div>
  );
}

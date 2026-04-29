import { Hand } from "./Hand";
import type { CardData, Phase } from "../types/game";

interface Props {
  cards: CardData[];
  value: number | null;
  phase: Phase;
  onCardEvent?: () => void;
}

export function DealerArea({ cards, value, phase, onCardEvent }: Props) {
  const showValue =
    value != null && phase !== "player_turns" && phase !== "betting";
  return (
    <div className="dealer-area">
      <h3>Dealer</h3>
      <div className="dealer-cards">
        <Hand cards={cards} onCardEvent={onCardEvent} />
      </div>
      {showValue && <div className="dealer-value">{value}</div>}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Card } from "./Card";
import type { CardData } from "../types/game";

interface Props {
  cards: CardData[];
  onCardEvent?: () => void;
  shake?: boolean;
  skinClass?: string;
}

export function Hand({ cards, onCardEvent, shake, skinClass }: Props) {
  const [shakeKey, setShakeKey] = useState(0);
  const prevShake = useRef(false);

  useEffect(() => {
    if (shake && !prevShake.current) setShakeKey((k) => k + 1);
    prevShake.current = !!shake;
  }, [shake]);

  return (
    <div
      className={shake ? "hand-shake" : undefined}
      key={shakeKey}
      style={{
        display: "flex",
        gap: "0.4rem",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {cards.map((c, i) => (
        <Card key={i} card={c} index={i} onFlip={onCardEvent} skinClass={skinClass} />
      ))}
    </div>
  );
}

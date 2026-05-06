import { memo, useEffect, useRef } from "react";
import type { CardData } from "../types/game";

interface Props {
  card: CardData;
  index: number;
  onFlip?: () => void;
  skinClass?: string;
}

const isRed = (suit: string) => suit === "♥" || suit === "♦";

export const Card = memo(function Card({ card, index, onFlip, skinClass }: Props) {
  const isHidden = card.rank === "?";
  const wasHidden = useRef(isHidden);
  const mounted = useRef(false);
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  useEffect(() => {
    let timeout: number | undefined;
    if (!mounted.current) {
      mounted.current = true;
      if (!isHidden) {
        timeout = window.setTimeout(() => onFlipRef.current?.(), 200 + index * 70);
      }
    } else if (wasHidden.current && !isHidden) {
      timeout = window.setTimeout(() => onFlipRef.current?.(), 250);
    }
    wasHidden.current = isHidden;
    return () => {
      if (timeout != null) clearTimeout(timeout);
    };
  }, [isHidden, card.rank, card.suit, index]);

  return (
    <div
      className="card-shell card-enter"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {isHidden ? (
        <div className={`card card-back card-face-enter${skinClass ? ` ${skinClass}` : ""}`} key="back" />
      ) : (
        <div
          className={`card card-face-enter ${isRed(card.suit) ? "card-red" : "card-black"}${skinClass ? ` ${skinClass}` : ""}`}
          key={`${card.rank}-${card.suit}`}
        >
          <span className="top">
            <span>{card.rank}</span>
            <span>{card.suit}</span>
          </span>
          <span className="center">{card.suit}</span>
          <span className="bottom">
            <span>{card.rank}</span>
            <span>{card.suit}</span>
          </span>
        </div>
      )}
    </div>
  );
});

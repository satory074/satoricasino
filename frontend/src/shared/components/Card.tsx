import { memo, useEffect, useRef } from "react";
import type { CardData } from "../types/game";

interface Props {
  card: CardData;
  index: number;
  onFlip?: () => void;
  skinClass?: string;
}

const isRed = (suit: string) => suit === "♥" || suit === "♦";

// Inline SVG suits: font glyphs for ♠♥♦♣ render hollow/inconsistent across
// platforms, so the pips are drawn. Filled with currentColor so the
// card-red / card-black (and cosmetic skin) color rules keep working.
const SUIT_PATHS: Record<string, string> = {
  "♥": "M12 21.1l-1.4-1.3C5.5 15.2 2.2 12.2 2.2 8.5 2.2 5.5 4.6 3.2 7.6 3.2c1.7 0 3.3.8 4.4 2 1.1-1.2 2.7-2 4.4-2 3 0 5.4 2.3 5.4 5.3 0 3.7-3.3 6.7-8.4 11.3L12 21.1z",
  "♦": "M12 1.8L19.2 12 12 22.2 4.8 12 12 1.8z",
  "♠": "M12 1.8C9.2 6.8 4.2 9.3 4.2 13.2c0 2.5 2 4.4 4.4 4.4.9 0 1.7-.2 2.4-.7-.3 1.5-.9 2.7-1.9 3.6v.7h5.8v-.7c-1-.9-1.6-2.1-1.9-3.6.7.5 1.5.7 2.4.7 2.4 0 4.4-1.9 4.4-4.4 0-3.9-5-6.4-7.8-11.4z",
  "♣": "M12 1.9c-2.2 0-3.9 1.7-3.9 3.9 0 .9.3 1.7.8 2.4a3.9 3.9 0 1 0 2.2 7.2c-.3 1.5-.9 2.8-1.9 3.7v.7h5.6v-.7c-1-.9-1.6-2.2-1.9-3.7a3.9 3.9 0 1 0 2.2-7.2c.5-.7.8-1.5.8-2.4 0-2.2-1.7-3.9-3.9-3.9z",
};

function SuitIcon({ suit, className }: { suit: string; className?: string }) {
  const d = SUIT_PATHS[suit];
  if (!d) return <span className={className}>{suit}</span>;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

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
            <span className="card-rank">{card.rank}</span>
            <SuitIcon suit={card.suit} className="card-suit-sm" />
          </span>
          <span className="center">
            <SuitIcon suit={card.suit} className="card-suit-lg" />
          </span>
          <span className="bottom">
            <span className="card-rank">{card.rank}</span>
            <SuitIcon suit={card.suit} className="card-suit-sm" />
          </span>
        </div>
      )}
    </div>
  );
});

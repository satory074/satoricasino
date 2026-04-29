import { motion } from "framer-motion";
import { memo, useEffect, useRef } from "react";
import type { CardData } from "../types/game";

interface Props {
  card: CardData;
  index: number;
  onFlip?: () => void;
}

const isRed = (suit: string) => suit === "♥" || suit === "♦";

export const Card = memo(function Card({ card, index, onFlip }: Props) {
  const isHidden = card.rank === "?";
  const colorClass = isHidden ? "" : isRed(card.suit) ? "card-red" : "card-black";
  const wasHidden = useRef(isHidden);
  const mounted = useRef(false);
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  useEffect(() => {
    let timeout: number | undefined;
    if (!mounted.current) {
      // freshly mounted card — entry animation completes ~300ms after delay
      mounted.current = true;
      if (!isHidden) {
        timeout = window.setTimeout(() => onFlipRef.current?.(), 250 + index * 100);
      }
    } else if (wasHidden.current && !isHidden) {
      // hole-card reveal: in-place flip
      timeout = window.setTimeout(() => onFlipRef.current?.(), 350);
    }
    wasHidden.current = isHidden;
    return () => {
      if (timeout != null) clearTimeout(timeout);
    };
  }, [isHidden, card.rank, card.suit, index]);

  return (
    <motion.div
      className={`card ${colorClass} ${isHidden ? "card-back" : ""}`}
      style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
      initial={{ x: 320, y: -180, rotateZ: -25, rotateY: 180, opacity: 0 }}
      animate={{
        x: 0,
        y: 0,
        rotateZ: 0,
        opacity: 1,
        rotateY: isHidden ? 180 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 22,
        delay: index * 0.05,
        rotateY: { duration: 0.55, delay: 0.15 },
      }}
    >
      {!isHidden && (
        <>
          <span className="top">
            <span>{card.rank}</span>
            <span>{card.suit}</span>
          </span>
          <span className="center">{card.suit}</span>
          <span className="bottom">
            <span>{card.rank}</span>
            <span>{card.suit}</span>
          </span>
        </>
      )}
    </motion.div>
  );
});

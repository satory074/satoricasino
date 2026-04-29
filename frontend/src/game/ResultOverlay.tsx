import { AnimatePresence, motion } from "framer-motion";
import type { Result } from "../types/game";

export type ResultKind = Result | "near_miss";

interface Props {
  shown: ResultKind | null;
  amount: number | null;
}

const TEXT_FOR: Record<ResultKind, string> = {
  blackjack: "BLACKJACK!!",
  win: "WIN!",
  push: "PUSH",
  lose: "BUST",
  near_miss: "SO CLOSE!",
};

export function ResultOverlay({ shown, amount }: Props) {
  return (
    <AnimatePresence>
      {shown && (
        <>
          {(shown === "blackjack" || shown === "win") && (
            <motion.div
              key="rim"
              className="result-rim-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          <motion.div
            key={shown}
            className={`result-overlay ${shown}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`result-overlay-text ${shown === "lose" ? "lose" : ""} ${
                shown === "push" ? "push" : ""
              } ${shown === "near_miss" ? "near-miss" : ""}`}
              initial={{ scale: 0.4, rotate: -8 }}
              animate={{ scale: [0.4, 1.25, 1], rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {TEXT_FOR[shown]}
              {amount != null && (shown === "win" || shown === "blackjack") && (
                <span className="result-amount">
                  +{amount.toLocaleString()}
                </span>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

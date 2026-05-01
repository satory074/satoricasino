import { AnimatePresence, motion } from "framer-motion";
import type { Result } from "../types/game";
import { useTranslation } from "../i18n/useTranslation";

export type ResultKind =
  | Result
  | "near_miss"
  | "bust"
  | "pinzoro"
  | "arashi"
  | "shigoro"
  | "hifumi"
  | "menashi"
  | "wakare";

interface Props {
  shown: ResultKind | null;
  amount: number | null;
}

const RIM_GLOW_KINDS: ResultKind[] = ["blackjack", "win", "pinzoro", "arashi", "shigoro"];
const POSITIVE_AMOUNT_KINDS: ResultKind[] = [
  "win",
  "blackjack",
  "pinzoro",
  "arashi",
  "shigoro",
];

export function ResultOverlay({ shown, amount }: Props) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {shown && (
        <>
          {RIM_GLOW_KINDS.includes(shown) && (
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
              className={`result-overlay-text ${
                shown === "lose" || shown === "bust" || shown === "menashi" ? "lose" : ""
              } ${shown === "push" || shown === "wakare" ? "push" : ""} ${
                shown === "near_miss" || shown === "hifumi" ? "near-miss" : ""
              } ${shown === "pinzoro" ? "pinzoro" : ""}`}
              initial={{ scale: 0.4, rotate: -8 }}
              animate={{ scale: [0.4, 1.25, 1], rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {t(`results.${shown}`)}
              {amount != null && amount > 0 && POSITIVE_AMOUNT_KINDS.includes(shown) && (
                <span className="result-amount">
                  +{amount.toLocaleString()}
                </span>
              )}
              {amount != null && amount < 0 && (
                <span className="result-amount loss">
                  {amount.toLocaleString()}
                </span>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

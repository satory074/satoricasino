import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "../i18n/useTranslation";

interface Props {
  achievementId: string | null;
  onDone: () => void;
}

export function AchievementToast({ achievementId, onDone }: Props) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {achievementId && (
        <motion.div
          className="achievement-toast"
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onAnimationComplete={(def) => {
            if (def === "animate" || (typeof def === "object" && "opacity" in def && (def as { opacity: number }).opacity === 1)) {
              setTimeout(onDone, 3000);
            }
          }}
        >
          <span className="achievement-toast-icon">🏆</span>
          <div>
            <div className="achievement-toast-title">{t("achievements.toast")}</div>
            <div className="achievement-toast-name">
              {t(`achievements.${achievementId}`)}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

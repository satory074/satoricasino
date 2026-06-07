import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "../i18n/useTranslation";
import { useModalA11y } from "../hooks/useModalA11y";

interface Props {
  open: boolean;
  onClose: () => void;
  gameType: "blackjack" | "chinchiro";
}

// Curated subset of the public guide sections — enough to play, not the full
// strategy essay. Keys are reused verbatim from the info pages (locales), so
// there is zero new copy to translate.
const SECTIONS: Record<Props["gameType"], { rootKey: string; ids: string[] }> = {
  blackjack: {
    rootKey: "blackjackGuide",
    ids: ["overview", "cardValues", "gameFlow", "actions", "payouts"],
  },
  chinchiro: {
    rootKey: "chinchiroGuide",
    ids: ["overview", "gameFlow", "hands", "oddsAndPayouts"],
  },
};

export function RulesModal({ open, onClose, gameType }: Props) {
  const { t } = useTranslation();
  const cardRef = useModalA11y<HTMLDivElement>({ open, onClose });
  const { rootKey, ids } = SECTIONS[gameType];
  const root = `info.${rootKey}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-card rules-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t(`${root}.title`)}
            tabIndex={-1}
            ref={cardRef}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">{t(`${root}.title`)}</div>
            <div className="rules-body">
              {ids.map((id) => {
                const body = t(`${root}.sections.${id}.body`);
                return (
                  <section key={id} className="rules-section">
                    <h3>{t(`${root}.sections.${id}.title`)}</h3>
                    {body.split("\n\n").map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </section>
                );
              })}
            </div>
            <button className="btn-primary" onClick={onClose}>
              {t("common.close")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

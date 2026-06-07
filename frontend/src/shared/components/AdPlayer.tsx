import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiPost } from "../api/api";
import { useTranslation } from "../i18n/useTranslation";
import { useModalA11y } from "../hooks/useModalA11y";
import { getAdBridge } from "../ad";

interface Props {
  open: boolean;
  adSessionId: string | null;
  onComplete: (result: { coins: number; reward: number }) => void;
  onCancel: () => void;
}

export function AdPlayer({ open, adSessionId, onComplete, onCancel }: Props) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(5);
  const [completing, setCompleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  // Escape disabled until the countdown finishes (reward requires the watch).
  const cardRef = useModalA11y<HTMLDivElement>({
    open,
    onClose: onCancel,
    escapeDisabled: countdown > 0,
  });

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      setCompleting(false);
      clearTimer();
      return;
    }

    // Countdown always runs — the reward is gated on watch time, not on a real
    // ad being available, so it must work even when no ad fills.
    intervalRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearTimer();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    const bridge = getAdBridge();
    const container = containerRef.current;
    if (container && bridge.isAvailable()) {
      // Render the real ad into the container (no-op for placeholder slots).
      bridge.show(container).catch(() => {
        // Bridge failure — countdown still works as fallback
      });
    }

    return clearTimer;
  }, [open, clearTimer]);

  const handleComplete = async () => {
    if (!adSessionId || completing) return;
    setCompleting(true);
    try {
      const result = await apiPost<{ coins: number; reward: number }>(
        `/api/ad/complete?ad_session_id=${encodeURIComponent(adSessionId)}`,
        {},
      );
      onComplete(result);
    } catch {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ zIndex: 1100 }}
        >
          <motion.div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={t("ads.watching")}
            tabIndex={-1}
            ref={cardRef}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">{t("ads.watching")}</div>
            <div ref={containerRef} className="ad-container">
              {import.meta.env.DEV && (
                <div className="ad-placeholder">
                  <div className="ad-placeholder-inner">
                    <span className="ad-placeholder-label">AD</span>
                  </div>
                </div>
              )}
            </div>
            {countdown > 0 ? (
              <div className="ad-countdown">{t("common.seconds", { n: countdown })}</div>
            ) : (
              <button
                className="btn-primary"
                onClick={handleComplete}
                disabled={completing}
              >
                {t("ads.complete")}
              </button>
            )}
            {countdown > 0 && (
              <button
                className="btn-secondary"
                onClick={onCancel}
                style={{ marginTop: "0.5rem" }}
              >
                {t("common.cancel")}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

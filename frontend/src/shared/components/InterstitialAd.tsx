import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import { useModalA11y } from "../hooks/useModalA11y";
import { BannerAd } from "./BannerAd";

interface InterstitialAdProps {
  open: boolean;
  onClose: () => void;
}

const COUNTDOWN_SEC = 3;

export function InterstitialAd({ open, onClose }: InterstitialAdProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(COUNTDOWN_SEC);
  // Escape only works once the forced countdown reaches 0 (mirrors click-dismiss).
  const cardRef = useModalA11y<HTMLDivElement>({
    open,
    onClose,
    escapeDisabled: remaining > 0,
  });

  useEffect(() => {
    if (!open) {
      setRemaining(COUNTDOWN_SEC);
      return;
    }
    const interval = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay interstitial-overlay" onClick={remaining === 0 ? onClose : undefined}>
      <div
        className="interstitial-ad"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="interstitial-ad-content">
          <BannerAd size="mrec" />
        </div>
        <div className="interstitial-ad-footer">
          {remaining > 0 ? (
            <p className="interstitial-countdown">
              {t("ads.interstitial")} ({remaining}s)
            </p>
          ) : (
            <button className="btn-primary" onClick={onClose}>
              {t("ads.skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

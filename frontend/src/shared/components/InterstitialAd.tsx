import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";

interface InterstitialAdProps {
  open: boolean;
  onClose: () => void;
}

const COUNTDOWN_SEC = 3;

export function InterstitialAd({ open, onClose }: InterstitialAdProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(COUNTDOWN_SEC);

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
      <div className="interstitial-ad" onClick={(e) => e.stopPropagation()}>
        <div className="interstitial-ad-content">
          <div className="ad-banner-mock ad-banner-mock--mrec" style={{ width: "min(300px, 100%)", height: "250px" }}>
            <span className="ad-banner-mock-label">AD 300x250</span>
          </div>
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

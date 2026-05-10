import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiGet } from "../shared/api/api";
import { useTranslation } from "../shared/i18n/useTranslation";
import type { AchievementInfo } from "../shared/types/game";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AchievementList({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<AchievementInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<AchievementInfo[]>("/api/achievements");
      setAchievements(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

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
            className="modal-card achievement-modal"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">
              {t("achievements.title")} ({unlockedCount}/{achievements.length})
            </div>

            {loading && achievements.length === 0 ? (
              <div className="leaderboard-loading">...</div>
            ) : (
              <div className="achievement-grid">
                {achievements.map((ach) => {
                  const pct = ach.threshold > 0
                    ? Math.min(100, Math.round((ach.progress / ach.threshold) * 100))
                    : 0;
                  return (
                    <div
                      key={ach.id}
                      className={`ach-card${ach.unlocked ? " ach-unlocked" : ""}`}
                    >
                      <div className="ach-icon">
                        {ach.unlocked ? "🏆" : "🔒"}
                      </div>
                      <div className="ach-info">
                        <div className="ach-name">
                          {t(`achievements.${ach.id}`)}
                        </div>
                        <div className="ach-bar-wrap">
                          <div
                            className="ach-bar"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="ach-progress">
                          {t("achievements.progress", {
                            progress: ach.progress,
                            threshold: ach.threshold,
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="btn-primary" onClick={onClose}>
              {t("common.close")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiGet } from "../shared/api/api";
import { getUserId } from "../shared/api/api";
import { useTranslation } from "../shared/i18n/useTranslation";
import { useModalA11y } from "../shared/hooks/useModalA11y";
import type { LeaderboardResponse } from "../shared/types/game";

type Metric = "coins" | "wins";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Leaderboard({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [metric, setMetric] = useState<Metric>("coins");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const myId = getUserId();
  const cardRef = useModalA11y<HTMLDivElement>({ open, onClose });

  const load = useCallback(async (m: Metric) => {
    setLoading(true);
    try {
      const res = await apiGet<LeaderboardResponse>(
        `/api/leaderboard?metric=${m}&limit=10`,
      );
      setData(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load(metric);
  }, [open, metric, load]);

  const switchMetric = (m: Metric) => setMetric(m);

  const medalColor = (i: number) => {
    if (i === 0) return "var(--gold-bright)";
    if (i === 1) return "var(--chip-white-deep)";
    if (i === 2) return "var(--stage-rim-hi)";
    return "var(--text-mid)";
  };

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
            className="modal-card leaderboard-card"
            role="dialog"
            aria-modal="true"
            aria-label={t("leaderboard.title")}
            tabIndex={-1}
            ref={cardRef}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">{t("leaderboard.title")}</div>

            <div className="leaderboard-tabs">
              <button
                className={`lb-tab${metric === "coins" ? " active" : ""}`}
                onClick={() => switchMetric("coins")}
              >
                {t("leaderboard.coins")}
              </button>
              <button
                className={`lb-tab${metric === "wins" ? " active" : ""}`}
                onClick={() => switchMetric("wins")}
              >
                {t("leaderboard.wins")}
              </button>
            </div>

            {loading && !data ? (
              <div className="leaderboard-loading">...</div>
            ) : (
              <>
                <div className="leaderboard-list">
                  {data?.entries.map((entry, i) => {
                    const isMe = entry.user_id === myId;
                    return (
                      <div
                        key={entry.user_id}
                        className={`lb-row${isMe ? " lb-me" : ""}`}
                      >
                        <span
                          className="lb-rank"
                          style={{ color: medalColor(i) }}
                        >
                          {i + 1}
                        </span>
                        <span className="lb-name">
                          {entry.display_name}
                          {isMe && (
                            <span className="lb-you">
                              {" "}
                              {t("leaderboard.you")}
                            </span>
                          )}
                        </span>
                        <span className="lb-value">
                          {(metric === "coins"
                            ? entry.coins
                            : entry.wins
                          ).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {data?.my_rank && data.my_rank > 10 && (
                  <div className="lb-my-rank">
                    {t("leaderboard.myRank", { rank: data.my_rank })}
                  </div>
                )}
              </>
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

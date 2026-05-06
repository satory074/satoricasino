import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../shared/api/api";
import { useTranslation } from "../shared/i18n/useTranslation";

interface Challenge {
  id: string;
  target: number;
  reward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface Props {
  onCoinsChanged: (coins: number, delta: number) => void;
  play: (id: "button_click" | "bonus") => void;
}

export function Challenges({ onCoinsChanged, play }: Props) {
  const { t } = useTranslation();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Challenge[]>("/api/challenges");
      setChallenges(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const claim = async (id: string) => {
    play("button_click");
    try {
      const res = await apiPost<{ coins: number; reward: number }>(
        `/api/challenges/${id}/claim`,
        {},
      );
      onCoinsChanged(res.coins, res.reward);
      play("bonus");
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, claimed: true } : c)),
      );
    } catch {
      /* ignore */
    }
  };

  if (loading || challenges.length === 0) return null;

  const anyClaimable = challenges.some((c) => c.completed && !c.claimed);

  return (
    <div className="challenges-section">
      <h3 style={{ position: "relative", display: "inline-block" }}>
        {t("challenges.title")}
        {anyClaimable && <span className="notify-dot" />}
      </h3>
      <div className="challenges-list">
        {challenges.map((ch) => {
          const pct = ch.target > 0
            ? Math.min(100, Math.round((ch.progress / ch.target) * 100))
            : 0;
          return (
            <div
              key={ch.id}
              className={`challenge-card${ch.claimed ? " ch-claimed" : ch.completed ? " ch-complete" : ""}`}
            >
              <div className="ch-top">
                <span className="ch-name">{t(`challenges.${ch.id}`)}</span>
                <span className="ch-reward">+{ch.reward}</span>
              </div>
              <div className="ach-bar-wrap">
                <div className="ach-bar" style={{ width: `${pct}%` }} />
              </div>
              <div className="ch-bottom">
                <span className="ach-progress">
                  {ch.progress} / {ch.target}
                </span>
                {ch.completed && !ch.claimed && (
                  <button
                    className="btn-primary ch-claim-btn"
                    onClick={() => claim(ch.id)}
                  >
                    {t("challenges.claim")}
                  </button>
                )}
                {ch.claimed && (
                  <span className="ch-done">{t("dailyStreak.claimed")}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

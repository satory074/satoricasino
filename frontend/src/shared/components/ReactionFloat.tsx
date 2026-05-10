import { useEffect, useState } from "react";
import type { Notification } from "../api/useGameSocket";
import { useTranslation } from "../i18n/useTranslation";

interface FloatingReaction {
  id: number;
  displayName: string;
  emoji: string;
}

interface Props {
  notifications: Notification[];
  dismissNotification: (id: number) => void;
}

export function ReactionFloat({ notifications, dismissNotification }: Props) {
  const { t } = useTranslation();
  const [floats, setFloats] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    const reactions = notifications.filter((n) => n.kind === "reaction");
    if (reactions.length === 0) return;

    const newFloats: FloatingReaction[] = reactions.map((n) => ({
      id: n.id,
      displayName: n.data.display_name as string,
      emoji: n.data.emoji as string,
    }));

    setFloats((prev) => [...prev, ...newFloats]);
    reactions.forEach((n) => dismissNotification(n.id));

    // Auto-remove after animation
    const ids = newFloats.map((f) => f.id);
    const timer = setTimeout(() => {
      setFloats((prev) => prev.filter((f) => !ids.includes(f.id)));
    }, 3000);

    return () => clearTimeout(timer);
  }, [notifications, dismissNotification]);

  return (
    <div className="reaction-float-area">
      {floats.map((f) => (
        <div key={f.id} className="reaction-float">
          <span className="rf-name">{f.displayName}</span>
          <span className="rf-emoji">{t(`reactions.${f.emoji}`)}</span>
        </div>
      ))}
    </div>
  );
}

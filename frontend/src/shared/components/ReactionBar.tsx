import { useCallback } from "react";
import { play } from "../audio/sounds";
import { useTranslation } from "../i18n/useTranslation";

const REACTION_IDS = ["gg", "nice", "wow", "ouch", "lol", "gl"] as const;

interface Props {
  send: (action: string, data?: Record<string, unknown>) => void;
}

export function ReactionBar({ send }: Props) {
  const { t } = useTranslation();
  const react = useCallback(
    (emoji: string) => {
      play("button_click");
      send("react", { emoji });
    },
    [send],
  );

  return (
    <div className="reaction-bar">
      {REACTION_IDS.map((id) => (
        <button
          key={id}
          className="reaction-btn"
          onClick={() => react(id)}
          type="button"
        >
          {t(`reactions.${id}`)}
        </button>
      ))}
    </div>
  );
}

import { useCallback } from "react";
import { play } from "../audio/sounds";

const REACTIONS = [
  { id: "gg", label: "GG" },
  { id: "nice", label: "Nice" },
  { id: "wow", label: "Wow" },
  { id: "ouch", label: "Ouch" },
  { id: "lol", label: "LOL" },
  { id: "gl", label: "GL" },
] as const;

interface Props {
  send: (action: string, data?: Record<string, unknown>) => void;
}

export function ReactionBar({ send }: Props) {
  const react = useCallback(
    (emoji: string) => {
      play("button_click");
      send("react", { emoji });
    },
    [send],
  );

  return (
    <div className="reaction-bar">
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          className="reaction-btn"
          onClick={() => react(r.id)}
          type="button"
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

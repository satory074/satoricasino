import { memo } from "react";
import clsx from "clsx";

interface Props {
  face: number | null; // null = hidden / rolling
  delay?: number;
}

// Pip layout grid: 3x3, each pip is rendered at a fixed position by face value.
// Positions 1-9 in row-major (top-left=1, top-mid=2, ..., bot-right=9).
const FACE_PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

export const Die = memo(function Die({ face, delay = 0 }: Props) {
  const pips = face ? FACE_PIPS[face] ?? [] : [];
  return (
    <div
      className={clsx("die", face != null ? "die-faceup" : "die-rolling")}
      style={{ animationDelay: `${delay}ms` }}
      key={face ?? "rolling"}
    >
      <div className="die-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) => (
          <span
            key={slot}
            className={clsx("die-pip", pips.includes(slot) && "die-pip-on")}
          />
        ))}
      </div>
    </div>
  );
});

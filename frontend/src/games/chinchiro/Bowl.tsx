import { Die } from "./Die";

interface Props {
  dice: [number, number, number] | null; // null = bowl empty / rolling
  rollKey?: string | number; // changing this restarts the tumble animation
  size?: "lg" | "sm";
  skinClass?: string;
}

export function Bowl({ dice, rollKey, size = "lg", skinClass }: Props) {
  return (
    <div className={`bowl bowl-${size}`} key={rollKey ?? "still"}>
      <div className="bowl-inner">
        {[0, 1, 2].map((i) => (
          <Die
            key={`${rollKey ?? "still"}-${i}`}
            face={dice ? dice[i] : null}
            delay={i * 70}
            skinClass={skinClass}
          />
        ))}
      </div>
    </div>
  );
}

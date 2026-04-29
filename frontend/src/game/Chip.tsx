import clsx from "clsx";

interface Props {
  value: number;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}

function classFor(v: number): string {
  if (v <= 10) return "chip-10";
  if (v <= 50) return "chip-50";
  if (v <= 100) return "chip-100";
  if (v <= 500) return "chip-500";
  return "chip-max";
}

export function Chip({ value, onClick, disabled, label }: Props) {
  return (
    <button
      type="button"
      className={clsx("chip", classFor(value))}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Bet ${value}`}
    >
      {label ?? value}
    </button>
  );
}

import clsx from "clsx";

export interface KeyHint {
  key: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  hints: KeyHint[];
}

export function KeyHintBar({ hints }: Props) {
  if (hints.length === 0) return null;
  return (
    <div className="key-hint-bar" role="presentation">
      {hints.map((h) => (
        <span
          key={h.key}
          className={clsx("hint", h.disabled && "is-disabled")}
        >
          <span className="key">{h.key}</span>
          <span className="label">{h.label}</span>
        </span>
      ))}
    </div>
  );
}

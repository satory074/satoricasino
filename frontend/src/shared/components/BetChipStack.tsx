import clsx from "clsx";

interface Props {
  amount: number;
}

const DENOMINATIONS = [1000, 500, 100, 50, 10] as const;
const MAX_VISIBLE = 8;

function chipClass(value: number): string {
  if (value >= 1000) return "chip-max";
  if (value >= 500) return "chip-500";
  if (value >= 100) return "chip-100";
  if (value >= 50) return "chip-50";
  return "chip-10";
}

function decompose(amount: number): number[] {
  const out: number[] = [];
  let remaining = amount;
  for (const d of DENOMINATIONS) {
    while (remaining >= d) {
      out.push(d);
      remaining -= d;
      if (out.length >= MAX_VISIBLE * 2) break;
    }
    if (out.length >= MAX_VISIBLE * 2) break;
  }
  return out;
}

export function BetChipStack({ amount }: Props) {
  if (amount <= 0) return <div className="bet-chip-stack" aria-hidden />;
  const all = decompose(amount);
  const visible = all.slice(0, MAX_VISIBLE);
  const overflow = all.length - visible.length;
  const stackOffset = 6; // pixels per chip in the stack (visual stagger)

  return (
    <div className="bet-chip-stack" aria-label={`Stack worth ${amount}`}>
      {visible.map((value, idx) => (
        <span
          // Re-key on amount so React remounts items when bet changes — replays drop animation
          key={`${amount}-${idx}-${value}`}
          className={clsx("bet-chip-stack-item", chipClass(value))}
          style={
            {
              "--chip-y": `-${idx * stackOffset}px`,
              animationDelay: `${idx * 45}ms`,
              zIndex: idx,
            } as React.CSSProperties
          }
        >
          {value >= 1000 ? "1K" : value}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="bet-chip-stack-overflow"
          style={{ bottom: `${visible.length * stackOffset + 4}px` }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

import clsx from "clsx";

export type ChinchiroHandName =
  | "pinzoro"
  | "arashi"
  | "shigoro"
  | "me"
  | "hifumi"
  | "menashi";

interface Props {
  hand: { name: string; eye: number } | null;
  size?: "lg" | "md";
}

const HAND_LABEL: Record<string, string> = {
  pinzoro: "ピンゾロ",
  arashi: "アラシ",
  shigoro: "シゴロ",
  me: "目",
  hifumi: "ヒフミ",
  menashi: "目なし",
};

export function HandLabel({ hand, size = "md" }: Props) {
  if (!hand) return <div className={`hand-label ${size}`}>—</div>;

  const baseLabel = HAND_LABEL[hand.name] ?? hand.name;
  let detail = "";
  if (hand.name === "arashi") detail = ` ${hand.eye}-${hand.eye}-${hand.eye}`;
  else if (hand.name === "me") detail = ` ${hand.eye}`;

  return (
    <div className={clsx("hand-label", size, `hand-${hand.name}`)}>
      {baseLabel}
      {detail && <span className="hand-detail">{detail}</span>}
    </div>
  );
}

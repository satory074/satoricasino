import clsx from "clsx";
import { useTranslation } from "../../shared/i18n/useTranslation";

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

export function HandLabel({ hand, size = "md" }: Props) {
  const { t } = useTranslation();
  if (!hand) return <div className={`hand-label ${size}`}>—</div>;

  const baseLabel = t(`hands.${hand.name}`);
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

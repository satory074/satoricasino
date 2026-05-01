import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "hit" | "stand" | "double" | "deal" | "secondary";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  variant: Variant;
  shortcut?: string;
  /** When the button is disabled, this short reason becomes its tooltip. */
  reason?: string | null;
  /** Pulse glow to mark this as the suggested next action. */
  highlight?: boolean;
  children: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  hit: "btn-hit",
  stand: "btn-stand",
  double: "btn-double",
  deal: "btn-deal",
  secondary: "btn-secondary",
};

export function ActionButton({
  variant,
  shortcut,
  reason,
  highlight,
  disabled,
  className,
  children,
  ...rest
}: Props) {
  const isSecondary = variant === "secondary";
  return (
    <button
      {...rest}
      disabled={disabled}
      title={disabled && reason ? reason : undefined}
      aria-disabled={disabled}
      className={clsx(
        !isSecondary && "action-btn",
        VARIANT_CLASS[variant],
        highlight && !disabled && "is-cta",
        className,
      )}
    >
      <span className="action-btn-label">{children}</span>
      {shortcut && <span className="action-btn-shortcut">{shortcut}</span>}
    </button>
  );
}

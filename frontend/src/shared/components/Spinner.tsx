import clsx from "clsx";

interface Props {
  /** Optional label rendered beneath the spinner (already-translated string). */
  label?: string;
  /** Larger ring for full-view loading states. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * CSS-keyframe loading spinner. Uses @keyframes (not Framer Motion) so it keeps
 * animating in background tabs — same reason cards/dice use CSS (see CLAUDE.md
 * "Sharp edges": rAF is paused in hidden tabs).
 */
export function Spinner({ label, size = "md", className }: Props) {
  return (
    <div className={clsx("spinner-wrap", className)} role="status" aria-live="polite">
      <span className={clsx("spinner", `spinner--${size}`)} aria-hidden="true" />
      {label ? <span className="spinner-label">{label}</span> : null}
    </div>
  );
}

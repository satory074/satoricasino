import clsx from "clsx";
import { useTranslation } from "../i18n/useTranslation";

interface Props {
  /** i18n namespace: phase.{gameType}.{step} */
  gameType: string;
  /** Current server phase id. */
  phase: string;
  /** The ordered round steps (waiting etc. render as plain text). */
  steps: string[];
}

/**
 * Always-visible round position: bet → deal → play → showdown.
 * Phases outside `steps` (waiting, …) render as a plain label.
 * Labels come from the existing `phase.{gameType}.{status}` keys.
 */
export function PhaseStepper({ gameType, phase, steps }: Props) {
  const { t } = useTranslation();
  const activeIndex = steps.indexOf(phase);

  if (activeIndex === -1) {
    return (
      <div className="phase-stepper phase-stepper--plain">
        {t(`phase.${gameType}.${phase}`)}
      </div>
    );
  }

  return (
    <ol className="phase-stepper">
      {steps.map((step, i) => (
        <li
          key={step}
          className={clsx(
            "phase-step",
            i === activeIndex && "is-active",
            i < activeIndex && "is-done",
          )}
          aria-current={i === activeIndex ? "step" : undefined}
        >
          {t(`phase.${gameType}.${step}`)}
        </li>
      ))}
    </ol>
  );
}

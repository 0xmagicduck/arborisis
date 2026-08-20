import styles from "./StepIndicator.module.css";

export const UPLOAD_STEPS = ["Sound", "Place & details", "Publish"] as const;

interface StepIndicatorProps {
  currentStep: number; // 0-indexed
  onStepClick?: (step: number) => void;
}

/**
 * Voir design/handoff/DEV-HANDOFF.md §2.6 — les étapes complétées sont
 * cliquables pour revenir en arrière, l'étape à venir ne l'est pas tant que
 * l'étape courante n'est pas validée.
 */
export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className={styles.indicator}>
      {UPLOAD_STEPS.map((label, index) => {
        const state = index < currentStep ? "done" : index === currentStep ? "current" : "upcoming";
        const clickable = state === "done" && Boolean(onStepClick);
        return (
          <div key={label} style={{ display: "contents" }}>
            <button
              type="button"
              className={styles.step}
              data-clickable={clickable}
              disabled={!clickable}
              onClick={clickable ? () => onStepClick?.(index) : undefined}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className={styles.bullet} data-state={state}>
                {state === "done" ? "✓" : index + 1}
              </span>
              <span className={styles.label} data-state={state}>
                {label}
              </span>
            </button>
            {index < UPLOAD_STEPS.length - 1 && <div className={styles.connector} aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}

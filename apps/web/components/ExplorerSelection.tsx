import type { Recording } from "@arborisis/shared-types";
import { RecordingSummaryCard } from "./RecordingSummaryCard";
import styles from "./ExplorerSelection.module.css";

/**
 * Rend à la fois le panneau flottant desktop et la BottomSheet mobile — un
 * seul visible à la fois via media query (voir ExplorerSelection.module.css),
 * pas de logique JS de bascule pour éviter tout décalage d'hydratation.
 */
export function ExplorerSelection({ recording, onClose }: { recording: Recording | null; onClose: () => void }) {
  if (!recording) return null;

  return (
    <>
      <div className={styles.panel}>
        <RecordingSummaryCard recording={recording} variant="panel" />
      </div>
      <div className={styles.sheet} role="dialog" aria-label={recording.title}>
        <button type="button" className={styles.handleButton} onClick={onClose} aria-label="Fermer">
          <span className={styles.handleBar} aria-hidden="true" />
        </button>
        <RecordingSummaryCard recording={recording} variant="sheet" />
      </div>
    </>
  );
}

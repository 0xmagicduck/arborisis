import type { Recording } from "@arborisis/shared-types";
import { formatDuration } from "@/lib/format";
import styles from "./SelectedStrip.module.css";

export function SelectedStrip({
  recordings,
  onSelect,
}: {
  recordings: Recording[];
  onSelect: (id: string) => void;
}) {
  if (recordings.length === 0) return null;

  return (
    <div className={styles.strip}>
      <span className={styles.label}>Selected</span>
      <div className={styles.items}>
        {recordings.slice(0, 4).map((recording) => (
          <button key={recording.id} type="button" className={styles.item} onClick={() => onSelect(recording.id)}>
            <span className={styles.title}>{recording.title}</span>
            <span className={styles.location}>{recording.locationLabel}</span>
            <span className={styles.duration}>{formatDuration(recording.durationSeconds)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

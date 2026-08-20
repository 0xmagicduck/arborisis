import Link from "next/link";
import type { Recording } from "@arborisis/shared-types";
import { formatDuration } from "@/lib/format";
import { Waveform } from "./Waveform";
import styles from "./RecordingCard.module.css";

const STATUS_LABELS: Partial<Record<Recording["status"], string>> = {
  processing: "Archiving…",
  failed: "Failed",
  draft: "Draft",
};

/**
 * Cellule de la grille Profil (desktop) — devient un gabarit Row en dessous
 * de 768px via CSS, voir design/handoff/DEV-HANDOFF.md §3.5 et
 * RecordingCard.module.css. Pas de PlayButton ici : absent du mockup Profile.
 *
 * `showStatus` : Profil affiche l'état "processing"/"failed" pour ses propres
 * enregistrements (voir plan/TASKS.md Phase 2, "État processing visible côté
 * utilisateur" — l'API l'exposait déjà, ceci en est le rendu écran).
 */
export function RecordingCard({ recording, showStatus = false }: { recording: Recording; showStatus?: boolean }) {
  const statusLabel = showStatus ? STATUS_LABELS[recording.status] : undefined;

  return (
    <Link href={`/enregistrements/${recording.id}`} className={styles.card}>
      <div className={styles.textCol}>
        <div className={styles.title}>{recording.title}</div>
        <div className={styles.location}>{recording.locationLabel}</div>
        <div className={styles.wave}>
          <Waveform data={recording.waveformPeaks} heightPx={18} maxBars={30} />
        </div>
      </div>
      <div className={styles.duration}>{statusLabel ?? formatDuration(recording.durationSeconds)}</div>
    </Link>
  );
}

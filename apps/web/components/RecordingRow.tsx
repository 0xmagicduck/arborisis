"use client";

import Link from "next/link";
import type { Recording } from "@arborisis/shared-types";
import { useAudioPlayer } from "@/lib/audio-player";
import { formatDateShort, formatDuration } from "@/lib/format";
import { PlayButton } from "./PlayButton";
import { Waveform } from "./Waveform";
import { Tags } from "./Tags";
import styles from "./RecordingRow.module.css";

interface RecordingRowProps {
  recording: Recording;
  /** Entrée éditoriale mise en avant en tête de Découvrir — voir DEV-HANDOFF §3.2. */
  featured?: boolean;
  /** Nom d'auteur affiché à côté du lieu — Découvrir (featured) uniquement, voir §2.5. */
  showAuthor?: boolean;
  /** "6:42 — Aug 16" plutôt que juste "6:42" — Découvrir, pas Recherche/Profil. */
  showDate?: boolean;
}

/**
 * Ligne d'enregistrement — Découvrir, Recherche. Voir
 * design/handoff/DEV-HANDOFF.md §2.5 ; le titre est le lien vers
 * RecordingDetail, le PlayButton reste un contrôle indépendant à l'intérieur
 * de la ligne (évite d'imbriquer un <button> dans un <a>).
 */
export function RecordingRow({ recording, featured = false, showAuthor = false, showDate = false }: RecordingRowProps) {
  const { toggle, isPlaying, isLoading, progress } = useAudioPlayer();
  const playing = isPlaying(recording.id);
  const url = recording.streamingUrl ?? recording.originalUrl;

  const metaParts = [recording.locationLabel];
  if (showAuthor) metaParts.push(recording.authorDisplayName ?? recording.authorHandle);

  return (
    <div className={styles.row} data-featured={featured}>
      <div className={styles.playCol}>
        <PlayButton
          sizePx={featured ? 52 : 36}
          playing={playing}
          loading={playing && isLoading}
          disabled={!url}
          title={recording.title}
          onClick={() => toggle({ id: recording.id, title: recording.title, url })}
        />
      </div>

      <div className={styles.titleCol}>
        <Link href={`/enregistrements/${recording.id}`} className={styles.title}>
          {recording.title}
        </Link>
        <div className={styles.meta}>{metaParts.join(showAuthor ? " — " : ", ")}</div>
      </div>

      <div className={styles.waveCol}>
        <Waveform
          data={recording.waveformPeaks}
          heightPx={featured ? 30 : 18}
          progress={playing ? progress : 0}
        />
      </div>

      <div className={styles.metaCol}>
        <div className={styles.tagsLine}>
          <Tags tags={recording.tags} tone="muted" />
        </div>
        <div className={styles.durationLine}>
          {formatDuration(recording.durationSeconds)}
          {showDate ? ` — ${formatDateShort(recording.recordedAt)}` : ""}
        </div>
      </div>
    </div>
  );
}

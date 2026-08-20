"use client";

import Link from "next/link";
import type { Recording } from "@arborisis/shared-types";
import { useAudioPlayer } from "@/lib/audio-player";
import { formatDuration } from "@/lib/format";
import { PlayButton } from "./PlayButton";
import { Waveform } from "./Waveform";
import styles from "./RecordingSummaryCard.module.css";

/**
 * Contenu partagé entre le panneau flottant desktop et la BottomSheet mobile
 * d'Explorer — voir design/handoff/DEV-HANDOFF.md §2.7 ("Contenu : identique
 * au panneau desktop").
 */
export function RecordingSummaryCard({
  recording,
  variant,
}: {
  recording: Recording;
  variant: "panel" | "sheet";
}) {
  const { toggle, isPlaying, isLoading, progress } = useAudioPlayer();
  const playing = isPlaying(recording.id);
  const url = recording.streamingUrl ?? recording.originalUrl;

  return (
    <div>
      <Link href={`/enregistrements/${recording.id}`} className={styles.title} style={{ fontSize: variant === "panel" ? 22 : 19 }}>
        {recording.title}
      </Link>
      <div className={styles.location}>{recording.locationLabel}</div>
      <div className={styles.author}>Recorded by {recording.authorDisplayName ?? recording.authorHandle}</div>

      <div className={styles.playRow}>
        <PlayButton
          sizePx={variant === "panel" ? 32 : 44}
          variant={variant === "sheet" ? "filled" : "outline"}
          tone="accent"
          playing={playing}
          loading={playing && isLoading}
          disabled={!url}
          title={recording.title}
          onClick={() => toggle({ id: recording.id, title: recording.title, url })}
        />
        <Waveform data={recording.waveformPeaks} heightPx={variant === "panel" ? 20 : 26} progress={playing ? progress : 0} maxBars={30} />
        <span className={styles.duration}>{formatDuration(recording.durationSeconds)}</span>
      </div>
    </div>
  );
}

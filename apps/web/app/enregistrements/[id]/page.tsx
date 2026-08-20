"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Recording } from "@arborisis/shared-types";
import { AppShell } from "@/components/AppShell";
import { PlayButton } from "@/components/PlayButton";
import { Waveform } from "@/components/Waveform";
import { LocationPreview } from "@/components/LocationPreview";
import { ErrorState } from "@/components/StateMessage";
import { ReportButton } from "@/components/ReportButton";
import { Skeleton } from "@/components/Skeleton";
import { useAudioPlayer } from "@/lib/audio-player";
import { formatDateLong, formatDuration } from "@/lib/format";
import { getRecording } from "@/lib/api";
import styles from "./page.module.css";

const LICENSE_LABELS: Record<Recording["license"], string> = {
  CC0: "CC0 1.0 — public domain",
  "CC-BY": "CC BY 4.0",
  "CC-BY-SA": "CC BY-SA 4.0",
  "CC-BY-NC": "CC BY-NC 4.0",
};

/**
 * Fiche d'un enregistrement — voir design/handoff/DEV-HANDOFF.md §3.3 et
 * design/system/RecordingDetail.dc.html + MobileRecordingDetail.dc.html.
 */
export default function RecordingDetailPage() {
  // `useParams()` plutôt que la prop `params` de la page : en Next 15 App
  // Router, `params` est un `Promise` côté Server Components (à `await`/`use()`)
  // mais cette page est un client component — `useParams()` est le chemin
  // stable côté client, sans dépendre du typage async de `params`.
  const params = useParams<{ id: string }>();
  const [recording, setRecording] = useState<Recording | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRecording(undefined);
    getRecording(params.id).then((r) => {
      if (!cancelled) setRecording(r);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id, attempt]);

  return (
    <AppShell activeNav={null} mobileHeader={{ kind: "back", fallbackHref: "/" }} showTabBar={false}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Explorer
        </Link>

        {recording === undefined && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Skeleton height={40} width="60%" />
            <Skeleton height={16} width="40%" />
            <Skeleton height={60} />
          </div>
        )}

        {recording === null && (
          <ErrorState
            message="Cet enregistrement est introuvable ou n'a pas encore été publié."
            onRetry={() => setAttempt((a) => a + 1)}
          />
        )}

        {recording && <RecordingDetailBody recording={recording} />}
      </div>
    </AppShell>
  );
}

/** Séparé du composant de page pour ne pas redéfinir ce sous-arbre (avec ses hooks) à chaque rendu. */
function RecordingDetailBody({ recording }: { recording: Recording }) {
  const { toggle, isPlaying, isLoading, progress, currentTimeSeconds } = useAudioPlayer();
  const playing = isPlaying(recording.id);
  const url = recording.streamingUrl ?? recording.originalUrl;
  const technicalRows: [string, string | null][] = [
    ["Equipment", recording.equipment],
    ["Sample rate", recording.sampleRate],
    ["Format", recording.format],
    ["License", LICENSE_LABELS[recording.license]],
  ];

  return (
    <>
      <h1 className={styles.title}>{recording.title}</h1>
      <div className={styles.meta}>
        <span className={styles.metaLocation}>{recording.locationLabel}</span>
        <span className={styles.metaDot}>·</span>
        <span className={styles.metaAuthorDate}>
          Recorded by {recording.authorDisplayName ?? recording.authorHandle} — {formatDateLong(recording.recordedAt)}
        </span>
      </div>

      <div className={styles.playRow}>
        <span className={styles.playButtonDesktop}>
          <PlayButton
            sizePx={56}
            variant="outline"
            tone="accent"
            playing={playing}
            loading={playing && isLoading}
            disabled={!url}
            title={recording.title}
            onClick={() => toggle({ id: recording.id, title: recording.title, url })}
          />
        </span>
        <span className={styles.playButtonMobile}>
          <PlayButton
            sizePx={64}
            variant="filled"
            tone="accent"
            playing={playing}
            loading={playing && isLoading}
            disabled={!url}
            title={recording.title}
            onClick={() => toggle({ id: recording.id, title: recording.title, url })}
          />
        </span>
        <Waveform data={recording.waveformPeaks} heightPx={60} progress={playing ? progress : 0} interactive maxBars={90} />
        <span className={styles.timeLabel}>
          {formatDuration(playing ? currentTimeSeconds : 0)} / {formatDuration(recording.durationSeconds)}
        </span>
      </div>

      <div className={styles.columns}>
        <div className={styles.mainCol}>
          {recording.description && <p className={styles.quote}>&ldquo;{recording.description}&rdquo;</p>}

          {recording.tags.length > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--color-ink-secondary)" }}>{recording.tags.join(" · ")}</div>
          )}

          {technicalRows.some(([, value]) => value) && (
            <div>
              <div className={styles.eyebrow}>Technical</div>
              <div className={styles.technical}>
                {technicalRows
                  .filter(([, value]) => value)
                  .map(([key, value]) => (
                    <div className={styles.technicalRow} key={key}>
                      <span className={styles.technicalKey}>{key}</span>
                      <span>{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {recording.iaItemUrl && (
            <a href={recording.iaItemUrl} target="_blank" rel="noreferrer" className={styles.archiveLink}>
              Original archived externally
            </a>
          )}

          <ReportButton recordingId={recording.id} />
        </div>

        <div className={styles.locationCol}>
          <div className={styles.eyebrow}>Location</div>
          <Link href={`/?focus=${recording.id}`} className={styles.locationBox}>
            <LocationPreview />
          </Link>
          <div className={styles.locationLabel}>{recording.locationLabel}</div>
        </div>
      </div>
    </>
  );
}

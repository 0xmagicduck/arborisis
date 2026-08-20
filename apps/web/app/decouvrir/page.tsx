"use client";

import { AppShell } from "@/components/AppShell";
import { RecordingRow } from "@/components/RecordingRow";
import { EmptyState, ErrorState } from "@/components/StateMessage";
import { Skeleton } from "@/components/Skeleton";
import { useRecordings } from "@/lib/use-recordings";
import styles from "./page.module.css";

/**
 * Découvrir — voir design/handoff/DEV-HANDOFF.md §3.2 et
 * design/system/Discover.dc.html. Pas de champ `featured` en base (Phase 3,
 * voir plan/TASKS.md) : on met en avant le plus récent plutôt que d'inventer
 * un algorithme, en attendant une éventuelle curation éditoriale ultérieure —
 * documenté dans le journal de session plutôt que masqué.
 */
export default function DiscoverPage() {
  const { recordings, status, error, retry } = useRecordings({ limit: 40 });
  const [featured, ...rest] = recordings;

  return (
    <AppShell activeNav="decouvrir" tagline mobileHeader={{ kind: "section", label: "Découvrir" }}>
      <div className={styles.container}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>Découvrir</div>
          <p className={styles.subtitle}>
            Une sélection de paysages sonores publiés récemment par la communauté, sans classement ni popularité.
          </p>
        </div>

        {status === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 24 }}>
            <Skeleton height={80} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        )}

        {status === "error" && <ErrorState message={`Impossible de charger les enregistrements : ${error}`} onRetry={retry} />}

        {status === "ready" && recordings.length === 0 && (
          <EmptyState message="Aucun enregistrement à afficher pour le moment." />
        )}

        {status === "ready" && featured && (
          <>
            <RecordingRow recording={featured} featured showAuthor />
            {rest.map((recording) => (
              <RecordingRow key={recording.id} recording={recording} showDate />
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}

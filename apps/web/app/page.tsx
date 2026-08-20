"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExplorerMap } from "@/components/ExplorerMap";
import { ExplorerSelection } from "@/components/ExplorerSelection";
import { SelectedStrip } from "@/components/SelectedStrip";
import { EmptyState, ErrorState } from "@/components/StateMessage";
import { useRecordings } from "@/lib/use-recordings";
import styles from "./page.module.css";

/**
 * Explorer — écran d'atterrissage, voir design/handoff/DEV-HANDOFF.md §3.1
 * et design/system/Explorer.dc.html. La carte réelle (MapLibre/pmtiles,
 * clustering) est Phase 4 (plan/TASKS.md) : voir components/ExplorerMap.tsx
 * pour le placeholder graphique utilisé ici en attendant.
 */
export default function ExplorerPage() {
  // `useSearchParams` exige une frontière Suspense en App Router (sinon Next
  // bascule toute la page en client-only au build avec un avertissement).
  return (
    <Suspense fallback={<AppShell activeNav="explorer" tagline mobileHeader={{ kind: "floating" }}><div className={styles.mapArea} /></AppShell>}>
      <ExplorerPageContent />
    </Suspense>
  );
}

function ExplorerPageContent() {
  const { recordings, status, error, retry } = useRecordings({ limit: 100 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Recentrage depuis la mini-carte de RecordingDetail (`/?focus=<id>`) —
  // voir components/LocationPreview.tsx et DEV-HANDOFF §3.3 ("un clic dessus
  // peut naviguer vers Explorer recentré sur ce point").
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  useEffect(() => {
    if (focusId) setSelectedId(focusId);
  }, [focusId]);

  const selected = useMemo(() => recordings.find((r) => r.id === selectedId) ?? null, [recordings, selectedId]);

  return (
    <AppShell activeNav="explorer" tagline mobileHeader={{ kind: "floating" }}>
      <div className={styles.mapArea}>
        {status === "ready" && (
          <ExplorerMap recordings={recordings} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {status === "loading" && <div className={styles.mapArea} />}
        {status === "error" && (
          <div className={styles.centerMessage} style={{ pointerEvents: "auto" }}>
            <ErrorState message={`Impossible de charger la carte : ${error}`} onRetry={retry} />
          </div>
        )}
        {status === "ready" && recordings.length === 0 && (
          <div className={styles.centerMessage}>
            <EmptyState message="Aucun enregistrement à afficher pour le moment." />
          </div>
        )}
        <ExplorerSelection recording={selected} onClose={() => setSelectedId(null)} />
      </div>
      <SelectedStrip recordings={recordings} onSelect={setSelectedId} />
    </AppShell>
  );
}

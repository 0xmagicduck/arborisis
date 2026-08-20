"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExplorerSelection } from "@/components/ExplorerSelection";
import { SelectedStrip } from "@/components/SelectedStrip";
import { EmptyState, ErrorState } from "@/components/StateMessage";
import { useRecording, useRecordings } from "@/lib/use-recordings";
import styles from "./page.module.css";

// Import dynamique, `ssr: false` explicite — `maplibre-gl` fait des accès
// WebGL/`window` au chargement du module qui font planter le rendu serveur
// (Next tente un rendu SSR même pour une page "use client" lors de la
// génération statique) avec une erreur `next/document` sans rapport,
// difficile à relier à la vraie cause. Constaté : `next build` échouait sur
// "Html should not be imported outside of pages/_document" tant que
// `ExplorerMap` était importé statiquement ici, alors que "/" est justement
// la seule page qui l'utilise — corrigé en isolant le composant du rendu
// serveur plutôt qu'en désactivant le SSR de toute la page.
const ExplorerMap = dynamic(() => import("@/components/ExplorerMap").then((m) => m.ExplorerMap), {
  ssr: false,
});

/**
 * Explorer — écran d'atterrissage, voir design/handoff/DEV-HANDOFF.md §3.1
 * et design/system/Explorer.dc.html. Carte réelle MapLibre/PMTiles +
 * clustering Supercluster depuis la Phase 4 (voir components/ExplorerMap.tsx)
 * — remplace le placeholder SVG de la Phase 3.
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
  // Liste générale — sert uniquement la bande "Selected" en bas de carte
  // (comportement hérité de la Phase 3, indépendant du viewport de la carte
  // elle-même désormais chargé par ExplorerMap via `GET /recordings/viewport`,
  // voir plan/08 §8.2). Pas la source des marqueurs affichés sur la carte.
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

  // Détail complet du marqueur sélectionné — un marqueur de carte ne porte
  // que id/titre/coordonnées (voir `RecordingMarker`), la requête ciblée
  // `GET /recordings/:id` peuple le panneau (voir plan/08 §8.2 point 4).
  const { recording: selected } = useRecording(selectedId);

  // Ne recentre la carte qu'une fois, quand la navigation `?focus=<id>`
  // aboutit — pas à chaque sélection ultérieure d'un autre marqueur tant que
  // l'URL porte encore ce même paramètre (sinon re-flyTo intempestif à
  // chaque clic direct sur la carte après une arrivée via RecordingDetail).
  const [flyTo, setFlyTo] = useState<{ id: string; lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (focusId && selected?.id === focusId) {
      setFlyTo({ id: selected.id, lat: selected.locationLat, lng: selected.locationLng });
    }
  }, [focusId, selected]);

  return (
    <AppShell activeNav="explorer" tagline mobileHeader={{ kind: "floating" }}>
      <div className={styles.mapArea}>
        <ExplorerMap selectedId={selectedId} onSelect={setSelectedId} flyTo={flyTo} />
        {status === "error" && (
          <div className={styles.centerMessage} style={{ pointerEvents: "auto" }}>
            <ErrorState message={`Impossible de charger la sélection : ${error}`} onRetry={retry} />
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

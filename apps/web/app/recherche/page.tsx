"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RecordingRow } from "@/components/RecordingRow";
import { EmptyState, ErrorState } from "@/components/StateMessage";
import { Skeleton } from "@/components/Skeleton";
import { useRecordings } from "@/lib/use-recordings";
import styles from "./page.module.css";

const DEBOUNCE_MS = 280; // voir DEV-HANDOFF §3.6 ("recommandé 250-300ms")

/**
 * Recherche — voir design/handoff/DEV-HANDOFF.md §3.6 et
 * design/system/Search.dc.html. `q` tape directement dans l'ILIKE naïf de
 * `GET /recordings` (voir apps/api/src/routes/recordings.ts) : un pis-aller
 * volontaire avant l'indexation Meilisearch de la Phase 4. Les filtres
 * "location / tag / duration" du mockup n'ont pas de contrepartie serveur
 * pour l'instant — affichés en texte inerte plutôt qu'en liens trompeurs.
 */
export default function SearchPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const hasQuery = query.length > 0;
  const { recordings, status, error, retry } = useRecordings({ q: query, limit: 60 }, hasQuery);

  return (
    <AppShell activeNav="recherche" mobileHeader={{ kind: "section", label: "Recherche" }}>
      <div className={styles.container}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search recordings, places, tags…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Rechercher des enregistrements"
        />

        <div className={styles.filters}>
          <span className={styles.filterLabel}>Filter by</span>
          <span className={styles.filterItem}>location</span>
          <span className={styles.filterItem}>tag</span>
          <span className={styles.filterItem}>duration</span>
        </div>

        {!hasQuery && <EmptyState message="Tapez un mot-clé pour rechercher un lieu, un titre ou une balise." />}

        {hasQuery && status === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Skeleton height={18} width={160} />
            <Skeleton height={50} />
            <Skeleton height={50} />
          </div>
        )}

        {hasQuery && status === "error" && <ErrorState message={`Recherche impossible : ${error}`} onRetry={retry} />}

        {hasQuery && status === "ready" && (
          <>
            <div className={styles.resultCount}>
              {recordings.length} recording{recordings.length === 1 ? "" : "s"} found
            </div>
            {recordings.length === 0 ? (
              <EmptyState message={`Aucun résultat pour "${query}".`} />
            ) : (
              recordings.map((recording) => <RecordingRow key={recording.id} recording={recording} />)
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

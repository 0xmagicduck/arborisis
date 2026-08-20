"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Recording, SearchFacets } from "@arborisis/shared-types";
import { AppShell } from "@/components/AppShell";
import { RecordingRow } from "@/components/RecordingRow";
import { EmptyState, ErrorState } from "@/components/StateMessage";
import { Skeleton } from "@/components/Skeleton";
import { searchRecordings } from "@/lib/api";
import styles from "./page.module.css";

const DEBOUNCE_MS = 280; // voir DEV-HANDOFF §3.6 ("recommandé 250-300ms")

const EMPTY_FACETS: SearchFacets = { tags: {}, license: {}, locationLabel: {} };

/**
 * Tranches de durée — voir plan/08-donnees-et-recherche.md §8.5 ("seuil exact
 * [...] à trancher selon le volume réel"). Choix arbitraire raisonnable pour
 * cette première version plutôt qu'un blocage en attendant une décision
 * produit ; facile à ajuster (une seule liste), voir plan/TASKS.md.
 */
const DURATION_BUCKETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under 1 min", max: 59 },
  { label: "1–5 min", min: 60, max: 299 },
  { label: "5–15 min", min: 300, max: 899 },
  { label: "15+ min", min: 900 },
];

type FilterKey = "location" | "tag" | "duration";

/**
 * Recherche — voir design/handoff/DEV-HANDOFF.md §3.6 et
 * design/system/Search.dc.html. Interroge Meilisearch (Phase 4, voir
 * apps/api/src/routes/recordings.ts `GET /recordings/search`) plutôt que
 * l'ILIKE naïf utilisé jusqu'ici. Les filtres "location / tag / duration" du
 * mockup sont désormais actifs (menus déroulants minimaux au clic, voir §3.6
 * "pas de modale, pas de panneau latéral lourd") plutôt qu'en texte inerte.
 */
export default function SearchPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [durationIndex, setDurationIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const hasActiveFilters = selectedTags.length > 0 || selectedLocations.length > 0 || durationIndex != null;
  const hasQuery = query.length > 0 || hasActiveFilters;
  const duration = durationIndex != null ? DURATION_BUCKETS[durationIndex] : undefined;

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [facets, setFacets] = useState<SearchFacets>(EMPTY_FACETS);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Toujours interroger l'API, même sans texte saisi ni filtre actif : la
    // requête à vide (`q=""`) sert à peupler les menus déroulants avec les
    // facettes disponibles dès le montage (voir `facets`, conservé même hors
    // affichage des résultats tant que `!hasQuery`).
    setStatus("loading");
    searchRecordings({
      q: query,
      tags: selectedTags,
      license: [],
      locationLabel: selectedLocations,
      minDurationSeconds: duration?.min,
      maxDurationSeconds: duration?.max,
    })
      .then((result) => {
        if (cancelled) return;
        setRecordings(result.recordings);
        setFacets(result.facets);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedTags, selectedLocations, durationIndex, attempt]);

  function toggleTag(tag: string) {
    setSelectedTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
  }
  function toggleLocation(location: string) {
    setSelectedLocations((locations) =>
      locations.includes(location) ? locations.filter((l) => l !== location) : [...locations, location]
    );
  }
  function selectDuration(index: number) {
    setDurationIndex((current) => (current === index ? null : index));
  }

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
          <FilterLink
            label="location"
            count={selectedLocations.length}
            open={openFilter === "location"}
            onToggle={() => setOpenFilter((f) => (f === "location" ? null : "location"))}
          >
            <FacetOptions facet={facets.locationLabel} selected={selectedLocations} onToggle={toggleLocation} />
          </FilterLink>
          <FilterLink
            label="tag"
            count={selectedTags.length}
            open={openFilter === "tag"}
            onToggle={() => setOpenFilter((f) => (f === "tag" ? null : "tag"))}
          >
            <FacetOptions facet={facets.tags} selected={selectedTags} onToggle={toggleTag} />
          </FilterLink>
          <FilterLink
            label="duration"
            count={durationIndex != null ? 1 : 0}
            open={openFilter === "duration"}
            onToggle={() => setOpenFilter((f) => (f === "duration" ? null : "duration"))}
          >
            <ul className={styles.filterOptions}>
              {DURATION_BUCKETS.map((bucket, index) => (
                <li key={bucket.label}>
                  <button
                    type="button"
                    className={durationIndex === index ? styles.filterOptionActive : styles.filterOption}
                    onClick={() => selectDuration(index)}
                  >
                    {bucket.label}
                  </button>
                </li>
              ))}
            </ul>
          </FilterLink>
        </div>

        {!hasQuery && status !== "loading" && (
          <EmptyState message="Tapez un mot-clé, ou choisissez un filtre, pour rechercher un lieu, un titre ou une balise." />
        )}

        {hasQuery && status === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Skeleton height={18} width={160} />
            <Skeleton height={50} />
            <Skeleton height={50} />
          </div>
        )}

        {hasQuery && status === "error" && (
          <ErrorState message={`Recherche impossible : ${error}`} onRetry={() => setAttempt((a) => a + 1)} />
        )}

        {hasQuery && status === "ready" && (
          <>
            <div className={styles.resultCount}>
              {recordings.length} recording{recordings.length === 1 ? "" : "s"} found
            </div>
            {recordings.length === 0 ? (
              <EmptyState message={query ? `Aucun résultat pour "${query}".` : "Aucun résultat pour ces filtres."} />
            ) : (
              recordings.map((recording) => <RecordingRow key={recording.id} recording={recording} />)
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

/** Lien texte souligné + menu déroulant minimal — voir DEV-HANDOFF §3.6. */
function FilterLink({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.filterWrap}>
      <button type="button" className={styles.filterItem} aria-expanded={open} onClick={onToggle}>
        {label}
        {count > 0 ? ` (${count})` : ""}
      </button>
      {open && <div className={styles.filterPanel}>{children}</div>}
    </div>
  );
}

function FacetOptions({
  facet,
  selected,
  onToggle,
}: {
  facet: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const entries = Object.entries(facet).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className={styles.filterEmpty}>Aucune option disponible pour l&apos;instant.</p>;
  }
  return (
    <ul className={styles.filterOptions}>
      {entries.map(([value, count]) => (
        <li key={value}>
          <button
            type="button"
            className={selected.includes(value) ? styles.filterOptionActive : styles.filterOption}
            onClick={() => onToggle(value)}
          >
            {value} <span className={styles.filterOptionCount}>{count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

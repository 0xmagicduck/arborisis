import { MeiliSearch } from "meilisearch";

// Réexporté pour que les consommateurs (apps/api, apps/worker) n'aient pas à
// déclarer `meilisearch` comme dépendance directe juste pour typer une
// décoration Fastify / une variable — voir apps/api/src/plugins/search.ts.
export type { MeiliSearch };

/**
 * Index Meilisearch "recordings" — voir plan/08-donnees-et-recherche.md §8.3.
 *
 * Un seul index, synchronisé par le worker à chaque passage de `status` à
 * `published` (voir apps/worker/src/jobs/publish-recording.ts). Pas de
 * synchronisation sur mise à jour de métadonnées pour l'instant : aucun
 * endpoint d'édition n'existe encore côté API (voir plan/TASKS.md Phase 3,
 * décision "Recherche/Profil-d'autrui/pagination avancée : non couverts"),
 * donc rien à re-synchroniser au-delà de la publication initiale.
 */
export const RECORDINGS_INDEX = "recordings";

/**
 * Document indexé — dénormalisé et volontairement plus étroit que
 * `recordingSchema` (@arborisis/shared-types) : seulement ce qui sert la
 * recherche/le filtrage, pas les URLs pré-signées (qui expirent) ni la
 * waveform. La réponse API fait un aller-retour DB après la recherche
 * Meilisearch pour reconstituer l'objet `Recording` complet — voir
 * apps/api/src/routes/recordings.ts `GET /recordings/search`.
 */
export interface RecordingSearchDocument {
  id: string;
  title: string;
  description: string | null;
  locationLabel: string;
  tags: string[];
  license: string;
  durationSeconds: number | null;
  /** Timestamp epoch (secondes) — Meilisearch trie plus naturellement sur un nombre qu'une date ISO. */
  recordedAt: number;
  createdAt: number;
}

export function createSearchClient(config: { host: string; apiKey: string }): MeiliSearch {
  return new MeiliSearch({ host: config.host, apiKey: config.apiKey });
}

/**
 * Crée l'index s'il n'existe pas et (ré)applique ses réglages — idempotent,
 * appelé au démarrage de l'API et du worker plutôt que via une migration
 * séparée (Meilisearch n'a pas de concept de migration versionnée comme
 * Drizzle : ses "settings" sont déclaratifs et réappliqués sans effet de bord
 * si déjà identiques).
 */
export async function ensureRecordingsIndex(client: MeiliSearch): Promise<void> {
  const task = await client.createIndex(RECORDINGS_INDEX, { primaryKey: "id" });
  await client.tasks.waitForTask(task.taskUid).catch(() => {
    // L'index existe déjà (code `index_already_exists`) — pas une erreur ici,
    // seul `updateSettings` ci-dessous doit réussir.
  });

  const index = client.index<RecordingSearchDocument>(RECORDINGS_INDEX);
  const settingsTask = await index.updateSettings({
    // Champs indexés — voir plan/08 §8.3.
    searchableAttributes: ["title", "description", "tags", "locationLabel"],
    // Facettes/filtres — voir plan/08 §8.3 ("tags, location_label, duration_seconds, license").
    filterableAttributes: ["tags", "license", "locationLabel", "durationSeconds"],
    sortableAttributes: ["recordedAt", "createdAt"],
    // Tolérance aux fautes de frappe native — comportement par défaut de
    // Meilisearch, réaffirmé ici explicitement plutôt qu'implicite (voir
    // plan/08 §8.3 "utile pour des noms d'espèces ou de lieux mal orthographiés").
    typoTolerance: { enabled: true },
  });
  await client.tasks.waitForTask(settingsTask.taskUid);
}

export async function indexRecording(client: MeiliSearch, doc: RecordingSearchDocument): Promise<void> {
  const task = await client.index<RecordingSearchDocument>(RECORDINGS_INDEX).addDocuments([doc]);
  await client.tasks.waitForTask(task.taskUid);
}

export async function deleteRecordingFromIndex(client: MeiliSearch, id: string): Promise<void> {
  const task = await client.index(RECORDINGS_INDEX).deleteDocument(id);
  await client.tasks.waitForTask(task.taskUid);
}

export interface SearchRecordingsParams {
  q: string;
  tags?: string[];
  license?: string[];
  /** Filtre exact — voir plan/08 §8.3 ("location_label" facettable). */
  locationLabel?: string[];
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  limit?: number;
}

export interface SearchRecordingsResult {
  ids: string[];
  facets: {
    tags: Record<string, number>;
    license: Record<string, number>;
    locationLabel: Record<string, number>;
  };
}

/**
 * Recherche + facettes — ne renvoie que les ids (dans l'ordre de pertinence
 * Meilisearch) et les distributions de facettes. Le contenu complet est
 * reconstitué côté API via une requête DB sur ces ids (voir
 * apps/api/src/routes/recordings.ts), pour rester la seule source de vérité
 * des URLs pré-signées/waveform plutôt que de dupliquer cette logique ici.
 */
export async function searchRecordings(
  client: MeiliSearch,
  params: SearchRecordingsParams
): Promise<SearchRecordingsResult> {
  const filters: string[] = [];
  if (params.tags?.length) {
    filters.push(`(${params.tags.map((t) => `tags = ${JSON.stringify(t)}`).join(" OR ")})`);
  }
  if (params.license?.length) {
    filters.push(`(${params.license.map((l) => `license = ${JSON.stringify(l)}`).join(" OR ")})`);
  }
  if (params.locationLabel?.length) {
    filters.push(`(${params.locationLabel.map((l) => `locationLabel = ${JSON.stringify(l)}`).join(" OR ")})`);
  }
  if (params.minDurationSeconds != null) {
    filters.push(`durationSeconds >= ${params.minDurationSeconds}`);
  }
  if (params.maxDurationSeconds != null) {
    filters.push(`durationSeconds <= ${params.maxDurationSeconds}`);
  }

  const result = await client.index<RecordingSearchDocument>(RECORDINGS_INDEX).search(params.q, {
    filter: filters.length ? filters.join(" AND ") : undefined,
    facets: ["tags", "license", "locationLabel"],
    limit: params.limit ?? 60,
  });

  return {
    ids: result.hits.map((hit) => hit.id),
    facets: {
      tags: result.facetDistribution?.tags ?? {},
      license: result.facetDistribution?.license ?? {},
      locationLabel: result.facetDistribution?.locationLabel ?? {},
    },
  };
}

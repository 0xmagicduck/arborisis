import type {
  CreateRecordingInput,
  CreateReportInput,
  Recording,
  RecordingMarker,
  SearchFacets,
  User,
} from "@arborisis/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include", // cookie de session httpOnly — voir plan/06 §6.5
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Requête échouée (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};

/**
 * Wrapper typé au-dessus de `api` pour les écrans de la Phase 3 — voir
 * design/handoff/DEV-HANDOFF.md et plan/TASKS.md. Les types viennent de
 * @arborisis/shared-types, la même source que le schéma validé côté API.
 */

export async function fetchMe(): Promise<User | null> {
  try {
    const { user } = await api.get<{ user: User }>("/auth/me");
    return user;
  } catch {
    // 401 attendu quand personne n'est connecté — pas une erreur à remonter.
    return null;
  }
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export interface ListRecordingsParams {
  q?: string;
  limit?: number;
}

/** GET /recordings — enregistrements publiés, voir apps/api/src/routes/recordings.ts. */
export async function listRecordings(params: ListRecordingsParams = {}): Promise<Recording[]> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const { recordings } = await api.get<{ recordings: Recording[] }>(`/recordings${qs ? `?${qs}` : ""}`);
  return recordings;
}

export interface ViewportBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * GET /recordings/viewport — marqueurs allégés pour la carte Explorer (Phase 4),
 * voir apps/api/src/routes/recordings.ts et plan/08 §8.2.
 */
export async function fetchViewportRecordings(bounds: ViewportBounds): Promise<RecordingMarker[]> {
  const search = new URLSearchParams({
    minLng: String(bounds.minLng),
    minLat: String(bounds.minLat),
    maxLng: String(bounds.maxLng),
    maxLat: String(bounds.maxLat),
  });
  const { recordings } = await api.get<{ recordings: RecordingMarker[] }>(`/recordings/viewport?${search}`);
  return recordings;
}

export interface SearchRecordingsParams {
  q: string;
  tags?: string[];
  license?: string[];
  locationLabel?: string[];
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
}

export interface SearchRecordingsResult {
  recordings: Recording[];
  facets: SearchFacets;
}

// Chaque valeur est échappée avant d'être jointe par des virgules —
// indispensable pour `locationLabel` ("Lieu, Pays" contient déjà une
// virgule), voir le commentaire miroir dans
// packages/shared-types/src/recording.ts (`commaSeparatedList`).
function encodeList(values: string[]): string {
  return values.map(encodeURIComponent).join(",");
}

/** GET /recordings/search — recherche Meilisearch (Phase 4), voir plan/08 §8.3. */
export async function searchRecordings(params: SearchRecordingsParams): Promise<SearchRecordingsResult> {
  const search = new URLSearchParams({ q: params.q });
  if (params.tags?.length) search.set("tags", encodeList(params.tags));
  if (params.license?.length) search.set("license", encodeList(params.license));
  if (params.locationLabel?.length) search.set("locationLabel", encodeList(params.locationLabel));
  if (params.minDurationSeconds != null) search.set("minDurationSeconds", String(params.minDurationSeconds));
  if (params.maxDurationSeconds != null) search.set("maxDurationSeconds", String(params.maxDurationSeconds));
  return api.get<SearchRecordingsResult>(`/recordings/search?${search}`);
}

export async function getRecording(id: string): Promise<Recording | null> {
  try {
    const { recording } = await api.get<{ recording: Recording }>(`/recordings/${id}`);
    return recording;
  } catch {
    return null;
  }
}

/** Enregistrements de l'utilisateur connecté, tous statuts — voir GET /recordings/mine. */
export async function myRecordings(): Promise<Recording[]> {
  const { recordings } = await api.get<{ recordings: Recording[] }>("/recordings/mine");
  return recordings;
}

export interface PresignUploadInput {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface PresignUploadResponse {
  uploadId: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

/** Étape 1 du flux Ajouter — voir plan/05-stockage-audio-internet-archive.md §5.3. */
export async function presignUpload(input: PresignUploadInput): Promise<PresignUploadResponse> {
  return api.post<PresignUploadResponse>("/uploads/presign", input);
}

/**
 * Dépôt direct vers Object Storage via l'URL pré-signée — volontairement en
 * dehors de `request()` : pas de cookie de session, pas de JSON, le corps est
 * le fichier brut avec son Content-Type propre (voir presignPutUrl côté API).
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Dépôt du fichier échoué (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Dépôt du fichier échoué (réseau)"));
    xhr.send(file);
  });
}

/** Étapes 2-3 du flux Ajouter — voir POST /recordings. */
export async function createRecording(
  input: CreateRecordingInput & { uploadId: string }
): Promise<Recording> {
  const { recording } = await api.post<{ recording: Recording }>("/recordings", input);
  return recording;
}

/**
 * Signalement (Phase 5, plan/10 §10.3) — voir POST /recordings/:id/reports.
 * Exige une session (401 sinon, propagé tel quel par `request()`).
 */
export async function reportRecording(recordingId: string, input: CreateReportInput): Promise<void> {
  await api.post(`/recordings/${recordingId}/reports`, input);
}

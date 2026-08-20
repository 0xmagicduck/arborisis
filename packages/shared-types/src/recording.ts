import { z } from "zod";

/**
 * Licences acceptées — restreintes aux licences libres car c'est une condition
 * d'hébergement sur Internet Archive (voir plan/05-stockage-audio-internet-archive.md §5.5),
 * qui reste la cible même si l'intégration IA est reportée (§5.10).
 */
export const licenseSchema = z.enum(["CC0", "CC-BY", "CC-BY-SA", "CC-BY-NC"]);
export type License = z.infer<typeof licenseSchema>;

export const recordingStatusSchema = z.enum([
  "draft",
  "processing",
  "published",
  "failed",
]);
export type RecordingStatus = z.infer<typeof recordingStatusSchema>;

export const recordingSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  /** Pseudo public de l'auteur — dénormalisé ici via jointure côté API pour éviter un aller-retour
   *  supplémentaire depuis chaque écran qui affiche "Recorded by {handle}" (Explorer, Découvrir). */
  authorHandle: z.string(),
  authorDisplayName: z.string().nullable(),
  title: z.string().min(1).max(140),
  description: z.string().max(2000).nullable(),
  locationLabel: z.string().max(140),
  locationLat: z.number().min(-90).max(90),
  locationLng: z.number().min(-180).max(180),
  recordedAt: z.coerce.date(),
  /** Connue seulement une fois le worker passé (ffprobe) — null tant que `status` n'est pas `published`/`failed`. */
  durationSeconds: z.number().int().positive().nullable(),
  tags: z.array(z.string().max(40)).max(10),
  license: licenseSchema,
  status: recordingStatusSchema,
  /**
   * URL de lecture pré-signée, recalculée par l'API à chaque réponse (le
   * container Object Storage est privé — voir plan/05 §5.10) : jamais stockée
   * telle quelle en base, null tant que le fichier n'est pas déposé (mode
   * intérimaire §5.10, copie pérenne = originals/ sur Object Storage Infomaniak).
   */
  originalUrl: z.string().url().nullable(),
  /** URL de lecture pré-signée du proxy transcodé (Opus) — même mécanisme que `originalUrl`. */
  streamingUrl: z.string().url().nullable(),
  /** Reste `null` tant qu'Internet Archive n'est pas actif (voir §5.10). */
  iaIdentifier: z.string().nullable(),
  /** "Original archived externally" — lien masqué côté UI tant que `null`. */
  iaItemUrl: z.string().url().nullable(),
  waveformPeaks: z.array(z.number()).nullable(),
  equipment: z.string().max(140).nullable(),
  sampleRate: z.string().max(20).nullable(),
  format: z.string().max(20).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Recording = z.infer<typeof recordingSchema>;

/**
 * Étape 2-3 du flux Ajouter — métadonnées + licence (voir design/system/Upload2-3.dc.html).
 *
 * `description`/`equipment` sont `.nullable()` dans `recordingSchema` (le champ
 * est toujours présent dans une réponse API, valant `null` ou une chaîne) mais
 * doivent en plus être `.optional()` ici : un client qui omet la clé plutôt
 * que d'envoyer explicitement `null` doit rester valide (constaté : `.nullable()`
 * seul rejette une clé absente avec "Required", ce qui n'est pas l'intention).
 */
export const createRecordingInputSchema = recordingSchema
  .pick({
    title: true,
    description: true,
    locationLabel: true,
    locationLat: true,
    locationLng: true,
    recordedAt: true,
    tags: true,
    license: true,
    equipment: true,
  })
  .extend({
    description: recordingSchema.shape.description.optional(),
    equipment: recordingSchema.shape.equipment.optional(),
  });
export type CreateRecordingInput = z.infer<typeof createRecordingInputSchema>;

/**
 * Types MIME acceptés à l'upload — formats de terrain courants (WAV/FLAC non
 * compressés, MP3/OGG/AAC déjà compressés), voir plan/05-stockage-audio-internet-archive.md §5.4/§5.9.
 * Le worker revalide de toute façon via ffprobe (§5.3) : cette liste ne fait
 * que filtrer les tentatives d'upload évidemment hors-sujet le plus tôt possible.
 */
export const uploadContentTypeSchema = z.enum([
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/opus",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
]);
export type UploadContentType = z.infer<typeof uploadContentTypeSchema>;

/** Étape 1 du flux Ajouter — POST /uploads/presign (voir plan/05 §5.3). */
export const presignUploadInputSchema = z.object({
  filename: z.string().min(1).max(180),
  contentType: uploadContentTypeSchema,
  // 500 Mo : plafond de raison, aucune limite documentée dans le plan —
  // ajustable via MAX_UPLOAD_BYTES côté API si besoin réel constaté.
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(500 * 1024 * 1024, "500 Mo maximum"),
});
export type PresignUploadInput = z.infer<typeof presignUploadInputSchema>;

export const presignUploadResponseSchema = z.object({
  uploadId: z.string().uuid(),
  uploadUrl: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
});
export type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>;

/** POST /recordings — métadonnées + licence (étapes 2-3) et référence au fichier déjà déposé en staging (étape 1). */
export const createRecordingRequestSchema = createRecordingInputSchema.extend({
  uploadId: z.string().uuid(),
});
export type CreateRecordingRequest = z.infer<typeof createRecordingRequestSchema>;

/**
 * GET /recordings/viewport — marqueur allégé pour la carte Explorer (Phase 4,
 * voir plan/08-donnees-et-recherche.md §8.2) : uniquement les champs
 * nécessaires au rendu d'un marqueur, pas la waveform/description/etc. Le
 * détail complet est récupéré via `GET /recordings/:id` au clic (déjà
 * existant, voir `recordingSchema`).
 */
export const recordingMarkerSchema = recordingSchema.pick({
  id: true,
  title: true,
  locationLat: true,
  locationLng: true,
});
export type RecordingMarker = z.infer<typeof recordingMarkerSchema>;

export const viewportQuerySchema = z.object({
  // Bounding box du viewport carte courant — voir ST_MakeEnvelope côté API.
  minLng: z.coerce.number().min(-180).max(180),
  minLat: z.coerce.number().min(-90).max(90),
  maxLng: z.coerce.number().min(-180).max(180),
  maxLat: z.coerce.number().min(-90).max(90),
  // Plafond de raison — voir plan/08 §8.5 ("à trancher" selon le volume réel).
  limit: z.coerce.number().int().positive().max(500).default(500),
});
export type ViewportQuery = z.infer<typeof viewportQuerySchema>;

/**
 * GET /recordings/search — recherche Meilisearch (Phase 4, voir plan/08 §8.3).
 * Remplace l'ILIKE naïf de `GET /recordings` utilisé jusqu'ici par `/recherche`.
 */
// `tags`/`license`/`locationLabel` arrivent en query string HTTP comme une
// chaîne unique séparée par des virgules (`?tags=forest,birds`) plutôt qu'en
// paramètre répété (`?tags=forest&tags=birds`) : évite de dépendre du parser
// de querystring de Fastify (un seul `?a=1&a=2` n'est pas toujours normalisé
// en tableau selon la configuration), plus simple à construire côté client.
//
// Chaque valeur est `encodeURIComponent`-échappée avant d'être jointe (voir
// `apps/web/lib/api.ts`) — indispensable pour `locationLabel`, qui contient
// lui-même une virgule ("Lieu, Pays", voir packages/db/src/schema.ts) : sans
// cet échappement, un split naïf sur "," couperait la valeur au mauvais
// endroit. `decodeURIComponent` échoue silencieusement (valeur ignorée)
// plutôt que de faire planter la requête sur un paramètre malformé.
const commaSeparatedList = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return [];
  return value
    .split(",")
    .map((v) => {
      try {
        return decodeURIComponent(v.trim());
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}, z.array(z.string()));

export const searchRecordingsQuerySchema = z.object({
  q: z.string().trim().max(140).default(""),
  // Facettes — voir plan/08 §8.3 ("tags, location_label, duration_seconds,
  // license") et l'écran Recherche (design/system/Search.dc.html, filtres
  // "location / tag / duration"). `locationLabel` en filtre exact (valeur de
  // facette complète, ex. "Sonian Forest, Belgium") plutôt qu'un texte libre
  // séparé — le champ de recherche principal (`q`) couvre déjà la recherche
  // floue sur le lieu.
  // `.default([])` inutile ici : `commaSeparatedList` (preprocess) renvoie
  // toujours un tableau, jamais `undefined`, même pour une clé absente.
  tags: commaSeparatedList,
  license: commaSeparatedList.pipe(z.array(licenseSchema)),
  locationLabel: commaSeparatedList,
  minDurationSeconds: z.coerce.number().int().nonnegative().optional(),
  maxDurationSeconds: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).default(60),
});
export type SearchRecordingsQuery = z.infer<typeof searchRecordingsQuerySchema>;

export const searchFacetsSchema = z.object({
  tags: z.record(z.string(), z.number().int().nonnegative()),
  license: z.record(z.string(), z.number().int().nonnegative()),
  locationLabel: z.record(z.string(), z.number().int().nonnegative()),
});
export type SearchFacets = z.infer<typeof searchFacetsSchema>;

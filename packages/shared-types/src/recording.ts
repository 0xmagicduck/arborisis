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

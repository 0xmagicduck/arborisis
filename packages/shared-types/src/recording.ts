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
  title: z.string().min(1).max(140),
  description: z.string().max(2000).nullable(),
  locationLabel: z.string().max(140),
  locationLat: z.number().min(-90).max(90),
  locationLng: z.number().min(-180).max(180),
  recordedAt: z.coerce.date(),
  durationSeconds: z.number().int().positive(),
  tags: z.array(z.string().max(40)).max(10),
  license: licenseSchema,
  status: recordingStatusSchema,
  /** Object Storage — copie pérenne en mode intérimaire (§5.10), null tant que non uploadé. */
  originalUrl: z.string().url().nullable(),
  /** Object Storage — proxy transcodé pour la lecture in-app. */
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

/** Étape 2-3 du flux Ajouter — métadonnées + licence (voir design/system/Upload2-3.dc.html). */
export const createRecordingInputSchema = recordingSchema.pick({
  title: true,
  description: true,
  locationLabel: true,
  locationLat: true,
  locationLng: true,
  recordedAt: true,
  tags: true,
  license: true,
  equipment: true,
});
export type CreateRecordingInput = z.infer<typeof createRecordingInputSchema>;

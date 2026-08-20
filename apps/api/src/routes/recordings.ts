import type { FastifyPluginAsync } from "fastify";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { recordings, type Db } from "@arborisis/db";
import { createRecordingRequestSchema } from "@arborisis/shared-types";
import { headObject, presignGetUrl, type S3Client } from "@arborisis/storage";
import { requireUserId, optionalUserId } from "../lib/auth.js";
import { takeStagedUpload } from "../lib/upload-store.js";

/**
 * Étapes 2-3 du flux Ajouter (création de l'enregistrement + enqueue du job de
 * publication) et lecture de l'état (« En cours d'archivage » côté UI) — voir
 * plan/05-stockage-audio-internet-archive.md §5.3.
 */

// Recalculée à chaque réponse plutôt que stockée : le container Object Storage
// est privé (voir @arborisis/storage `presignGetUrl` pour le détail).
const GET_URL_TTL_SECONDS = 60 * 60;

// `locationPoint` (type PostGIS `geography`) n'a pas de décodage générique côté
// driver — on extrait lat/lng explicitement via ST_X/ST_Y ici, comme documenté
// dans packages/db/src/columns.ts (résolu plus généralement en Phase 4).
const recordingSelection = {
  id: recordings.id,
  authorId: recordings.authorId,
  title: recordings.title,
  description: recordings.description,
  locationLabel: recordings.locationLabel,
  locationLat: sql<number>`ST_Y(${recordings.locationPoint}::geometry)`.as("location_lat"),
  locationLng: sql<number>`ST_X(${recordings.locationPoint}::geometry)`.as("location_lng"),
  recordedAt: recordings.recordedAt,
  durationSeconds: recordings.durationSeconds,
  tags: recordings.tags,
  license: recordings.license,
  status: recordings.status,
  originalKey: recordings.originalKey,
  proxyKey: recordings.proxyKey,
  iaIdentifier: recordings.iaIdentifier,
  iaItemUrl: recordings.iaItemUrl,
  waveformPeaks: recordings.waveformPeaks,
  equipment: recordings.equipment,
  sampleRate: recordings.sampleRate,
  format: recordings.format,
  createdAt: recordings.createdAt,
  updatedAt: recordings.updatedAt,
};

interface RecordingRow {
  id: string;
  authorId: string;
  title: string;
  description: string | null;
  locationLabel: string;
  locationLat: number;
  locationLng: number;
  recordedAt: Date;
  durationSeconds: number | null;
  tags: string[];
  license: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC";
  status: "draft" | "processing" | "published" | "failed";
  originalKey: string | null;
  proxyKey: string | null;
  iaIdentifier: string | null;
  iaItemUrl: string | null;
  waveformPeaks: number[] | null;
  equipment: string | null;
  sampleRate: string | null;
  format: string | null;
  createdAt: Date;
  updatedAt: Date;
}

async function serializeRecording(row: RecordingRow, storage: { client: S3Client; bucket: string }) {
  const [originalUrl, streamingUrl] = await Promise.all([
    row.originalKey ? presignGetUrl(storage.client, storage.bucket, row.originalKey, GET_URL_TTL_SECONDS) : null,
    row.proxyKey ? presignGetUrl(storage.client, storage.bucket, row.proxyKey, GET_URL_TTL_SECONDS) : null,
  ]);

  return {
    id: row.id,
    authorId: row.authorId,
    title: row.title,
    description: row.description,
    locationLabel: row.locationLabel,
    locationLat: row.locationLat,
    locationLng: row.locationLng,
    recordedAt: row.recordedAt,
    durationSeconds: row.durationSeconds,
    tags: row.tags,
    license: row.license,
    status: row.status,
    originalUrl,
    streamingUrl,
    iaIdentifier: row.iaIdentifier,
    iaItemUrl: row.iaItemUrl,
    waveformPeaks: row.waveformPeaks,
    equipment: row.equipment,
    sampleRate: row.sampleRate,
    format: row.format,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function findRecordingById(db: Db, id: string): Promise<RecordingRow | undefined> {
  const [row] = await db.select(recordingSelection).from(recordings).where(eq(recordings.id, id));
  return row;
}

const recordingIdParamsSchema = z.object({ id: z.string().uuid() });

const recordingsRoutes: FastifyPluginAsync = async (fastify) => {
  const { db, redis, storage, publishQueue } = fastify;

  fastify.post(
    "/recordings",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const userId = await requireUserId(request, reply, redis);
      if (!userId) return;

      const input = createRecordingRequestSchema.parse(request.body);

      const staged = await takeStagedUpload(redis, input.uploadId);
      if (!staged || staged.userId !== userId) {
        return reply.code(400).send({ error: "upload_not_found" });
      }

      // Le fichier doit avoir été réellement déposé sur le staging avant de
      // créer l'enregistrement et d'enqueuer un job qui échouerait sinon.
      const head = await headObject(storage.client, storage.bucket, staged.key);
      if (!head) {
        return reply.code(400).send({ error: "upload_incomplete" });
      }

      const [inserted] = await db
        .insert(recordings)
        .values({
          authorId: userId,
          title: input.title,
          description: input.description ?? null,
          locationLabel: input.locationLabel,
          locationPoint: { lat: input.locationLat, lng: input.locationLng },
          recordedAt: input.recordedAt,
          tags: input.tags,
          license: input.license,
          equipment: input.equipment ?? null,
          status: "processing",
        })
        .returning({ id: recordings.id });

      if (!inserted) {
        return reply.code(500).send({ error: "recording_creation_failed" });
      }

      await publishQueue.add("publish-recording", {
        recordingId: inserted.id,
        stagingKey: staged.key,
        originalFilename: staged.filename,
      });

      const row = await findRecordingById(db, inserted.id);
      if (!row) return reply.code(500).send({ error: "recording_creation_failed" });

      return reply.code(201).send({ recording: await serializeRecording(row, storage) });
    }
  );

  // Visible publiquement une fois `published` ; sinon réservé à l'auteur (état
  // "En cours d'archivage" / "failed" — voir plan/05 §5.3).
  fastify.get("/recordings/:id", async (request, reply) => {
    const { id } = recordingIdParamsSchema.parse(request.params);
    const row = await findRecordingById(db, id);
    if (!row) return reply.code(404).send({ error: "not_found" });

    if (row.status !== "published") {
      const userId = await optionalUserId(request, redis);
      if (userId !== row.authorId) {
        // Pas de fuite d'existence pour un enregistrement non publié.
        return reply.code(404).send({ error: "not_found" });
      }
    }

    return reply.send({ recording: await serializeRecording(row, storage) });
  });

  // Enregistrements de l'utilisateur connecté, tous statuts confondus — permet
  // de voir l'état "processing" côté profil pendant que le worker travaille.
  fastify.get("/recordings/mine", async (request, reply) => {
    const userId = await requireUserId(request, reply, redis);
    if (!userId) return;

    const rows = await db
      .select(recordingSelection)
      .from(recordings)
      .where(eq(recordings.authorId, userId))
      .orderBy(desc(recordings.createdAt));

    return reply.send({ recordings: await Promise.all(rows.map((row) => serializeRecording(row, storage))) });
  });
};

export default recordingsRoutes;

import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { recordings, users, type Db } from "@arborisis/db";
import { searchRecordings } from "@arborisis/search";
import {
  createRecordingRequestSchema,
  searchRecordingsQuerySchema,
  viewportQuerySchema,
  type RecordingMarker,
} from "@arborisis/shared-types";
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
  // Dénormalisé via jointure sur `users` — voir recordingSchema dans
  // @arborisis/shared-types pour le pourquoi (évite un aller-retour par écran
  // pour afficher "Recorded by {handle}").
  authorHandle: users.handle,
  authorDisplayName: users.displayName,
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
  authorHandle: string;
  authorDisplayName: string | null;
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
    authorHandle: row.authorHandle,
    authorDisplayName: row.authorDisplayName,
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

function baseRecordingsQuery(db: Db) {
  // `innerJoin` : `recordings.author_id` est NOT NULL avec FK `ON DELETE CASCADE`
  // vers `users` (voir packages/db/src/schema.ts), un enregistrement existant a
  // donc toujours un auteur — pas besoin d'un left join défensif ici.
  return db.select(recordingSelection).from(recordings).innerJoin(users, eq(users.id, recordings.authorId));
}

async function findRecordingById(db: Db, id: string): Promise<RecordingRow | undefined> {
  const [row] = await baseRecordingsQuery(db).where(eq(recordings.id, id));
  return row;
}

const recordingIdParamsSchema = z.object({ id: z.string().uuid() });

// Liste publique (Explorer, Découvrir, Recherche, Profil) — voir plan/TASKS.md
// Phase 3. `q` fait une recherche texte naïve ILIKE sur titre/lieu/tags : un
// pis-aller volontaire en attendant l'indexation Meilisearch de la Phase 4
// (plan/08-donnees-et-recherche.md), pas une tentative de pertinence avancée.
const listRecordingsQuerySchema = z.object({
  q: z.string().trim().min(1).max(140).optional(),
  limit: z.coerce.number().int().positive().max(200).default(60),
});

const recordingsRoutes: FastifyPluginAsync = async (fastify) => {
  const { db, redis, storage, publishQueue } = fastify;

  // Doit rester déclarée avant `/recordings/:id` : Fastify matche par
  // spécificité de route, pas par ordre d'enregistrement, donc pas de
  // conflit réel ici — mais gardé en premier pour la lisibilité (liste avant
  // détail).
  fastify.get("/recordings", async (request, reply) => {
    const { q, limit } = listRecordingsQuerySchema.parse(request.query);

    const textFilter = q
      ? sql`(
          ${recordings.title} ILIKE ${`%${q}%`}
          OR ${recordings.locationLabel} ILIKE ${`%${q}%`}
          OR EXISTS (SELECT 1 FROM unnest(${recordings.tags}) AS tag WHERE tag ILIKE ${`%${q}%`})
        )`
      : undefined;

    const rows = await baseRecordingsQuery(db)
      .where(textFilter ? and(eq(recordings.status, "published"), textFilter) : eq(recordings.status, "published"))
      .orderBy(desc(recordings.recordedAt))
      .limit(limit);

    return reply.send({ recordings: await Promise.all(rows.map((row) => serializeRecording(row, storage))) });
  });

  // Marqueurs de la carte Explorer (Phase 4) — voir plan/08-donnees-et-recherche.md
  // §8.2 : filtre PostGIS `ST_MakeEnvelope` + `&&` sur l'index GIST
  // (`recordings_location_gix`), ne renvoie que les champs nécessaires au
  // marqueur (id, coordonnées, titre) — pas la waveform/URLs pré-signées,
  // récupérées séparément via `GET /recordings/:id` au clic sur un marqueur.
  fastify.get("/recordings/viewport", async (request, reply) => {
    const { minLng, minLat, maxLng, maxLat, limit } = viewportQuerySchema.parse(request.query);

    const bboxFilter = sql`${recordings.locationPoint} && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::geography`;

    const rows = await db
      .select({
        id: recordings.id,
        title: recordings.title,
        locationLat: sql<number>`ST_Y(${recordings.locationPoint}::geometry)`,
        locationLng: sql<number>`ST_X(${recordings.locationPoint}::geometry)`,
      })
      .from(recordings)
      .where(and(eq(recordings.status, "published"), bboxFilter))
      .limit(limit);

    return reply.send({ recordings: rows satisfies RecordingMarker[] });
  });

  // Recherche Meilisearch (Phase 4) — remplace l'ILIKE naïf de `GET /recordings`
  // pour l'écran Recherche, voir plan/08 §8.3. Meilisearch ne renvoie que des
  // ids + facettes (voir @arborisis/search) : le contenu complet (URLs
  // pré-signées, waveform) reste reconstitué depuis la DB, seule source de
  // vérité pour ces champs qui expirent/évoluent — pas dupliqué dans l'index.
  fastify.get("/recordings/search", async (request, reply) => {
    const query = searchRecordingsQuerySchema.parse(request.query);

    const { ids, facets } = await searchRecordings(fastify.meilisearch, {
      q: query.q,
      tags: query.tags,
      license: query.license,
      locationLabel: query.locationLabel,
      minDurationSeconds: query.minDurationSeconds,
      maxDurationSeconds: query.maxDurationSeconds,
      limit: query.limit,
    });

    if (ids.length === 0) {
      return reply.send({ recordings: [], facets });
    }

    // Meilisearch renvoie déjà les ids triés par pertinence — la requête DB
    // ne préserve pas cet ordre nativement (`inArray` ne trie pas), donc on
    // réordonne explicitement après coup plutôt que de complexifier la
    // requête SQL avec un `ORDER BY array_position`.
    const rows = await baseRecordingsQuery(db).where(
      and(eq(recordings.status, "published"), inArray(recordings.id, ids))
    );
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = ids.map((id) => byId.get(id)).filter((row): row is RecordingRow => row != null);

    return reply.send({
      recordings: await Promise.all(ordered.map((row) => serializeRecording(row, storage))),
      facets,
    });
  });

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

    const rows = await baseRecordingsQuery(db)
      .where(eq(recordings.authorId, userId))
      .orderBy(desc(recordings.createdAt));

    return reply.send({ recordings: await Promise.all(rows.map((row) => serializeRecording(row, storage))) });
  });
};

export default recordingsRoutes;

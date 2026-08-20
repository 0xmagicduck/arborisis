import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { recordings, reports, users } from "@arborisis/db";
import { createReportInputSchema, updateReportStatusInputSchema } from "@arborisis/shared-types";
import { z } from "zod";
import { requireUserId } from "../lib/auth.js";
import { requireAdmin } from "../lib/admin.js";

/**
 * Signalement minimal (plan/10-securite-confidentialite-conformite.md §10.3) :
 * un bouton "Signaler" sur RecordingDetail crée un signalement en base ; la
 * revue se fait via GET/PATCH /reports, restreints aux handles ADMIN_HANDLES
 * (pas d'écran d'administration dédié — voir apps/api/src/lib/admin.ts).
 */
const reportSelection = {
  id: reports.id,
  recordingId: reports.recordingId,
  recordingTitle: recordings.title,
  reporterId: reports.reporterId,
  reporterHandle: users.handle,
  reason: reports.reason,
  details: reports.details,
  status: reports.status,
  createdAt: reports.createdAt,
  resolvedAt: reports.resolvedAt,
};

const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  const { db, redis } = fastify;
  const env = fastify.env;

  // Limite basse mais pas nulle : un signalement légitime est un geste rare,
  // pas une action répétée — protège contre un compte qui spammerait des
  // signalements plutôt que contre un usage normal.
  const reportRateLimit = { max: 5, timeWindow: "1 hour" as const };

  fastify.post(
    "/recordings/:id/reports",
    { config: { rateLimit: reportRateLimit } },
    async (request, reply) => {
      const userId = await requireUserId(request, reply, redis);
      if (!userId) return;

      const { id: recordingId } = z.object({ id: z.string().uuid() }).parse(request.params);
      const input = createReportInputSchema.parse(request.body);

      const [recording] = await db
        .select({ id: recordings.id, status: recordings.status })
        .from(recordings)
        .where(eq(recordings.id, recordingId))
        .limit(1);
      // Pas de fuite d'existence pour un enregistrement non publié (même
      // règle que GET /recordings/:id, voir routes/recordings.ts).
      if (!recording || recording.status !== "published") {
        return reply.code(404).send({ error: "not_found" });
      }

      // Idempotent : un second signalement de la même personne sur le même
      // enregistrement ne crée pas de doublon (contrainte unique en base) —
      // traité comme un succès silencieux plutôt qu'une erreur 409, l'intention
      // de la personne ("je signale ceci") est déjà satisfaite.
      await db
        .insert(reports)
        .values({ recordingId, reporterId: userId, reason: input.reason, details: input.details ?? null })
        .onConflictDoNothing({ target: [reports.recordingId, reports.reporterId] });

      return reply.code(201).send({ ok: true });
    }
  );

  fastify.get("/reports", async (request, reply) => {
    const adminId = await requireAdmin(request, reply, db, redis, env.ADMIN_HANDLES);
    if (!adminId) return;

    const { status } = z
      .object({ status: z.enum(["open", "resolved", "dismissed"]).default("open") })
      .parse(request.query);

    const rows = await db
      .select(reportSelection)
      .from(reports)
      .innerJoin(recordings, eq(reports.recordingId, recordings.id))
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(and(eq(reports.status, status)))
      .orderBy(desc(reports.createdAt));

    return reply.send({ reports: rows });
  });

  fastify.patch("/reports/:id", async (request, reply) => {
    const adminId = await requireAdmin(request, reply, db, redis, env.ADMIN_HANDLES);
    if (!adminId) return;

    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = updateReportStatusInputSchema.parse(request.body);

    const [updated] = await db
      .update(reports)
      .set({ status: input.status, resolvedAt: new Date() })
      .where(eq(reports.id, id))
      .returning({ id: reports.id });

    if (!updated) return reply.code(404).send({ error: "not_found" });
    return reply.send({ ok: true });
  });
};

export default reportsRoutes;

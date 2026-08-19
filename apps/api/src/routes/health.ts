import type { FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";

/** Cible du healthcheck GitHub Actions `deploy.yml` — voir plan/09-open-source-devops.md §9.3. */
const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_request, reply) => {
    await fastify.db.execute(sql`select 1`);
    await fastify.redis.ping();
    return reply.send({ ok: true, archiveToIA: fastify.env.ARCHIVE_TO_IA });
  });
};

export default healthRoutes;

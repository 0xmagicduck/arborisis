import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { createDb, type Db } from "@arborisis/db";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

const dbPlugin: FastifyPluginAsync<{ connectionString: string }> = async (fastify, opts) => {
  const db = createDb(opts.connectionString);
  fastify.decorate("db", db);
};

export default fp(dbPlugin, { name: "db" });

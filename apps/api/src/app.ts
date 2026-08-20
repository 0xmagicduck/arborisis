import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import type { Env } from "./config.js";
import dbPlugin from "./plugins/db.js";
import envPlugin from "./plugins/env.js";
import queuePlugin from "./plugins/queue.js";
import redisPlugin from "./plugins/redis.js";
import searchPlugin from "./plugins/search.js";
import storagePlugin from "./plugins/storage.js";
import authRoutes from "./routes/auth.js";
import geocodeRoutes from "./routes/geocode.js";
import healthRoutes from "./routes/health.js";
import recordingsRoutes from "./routes/recordings.js";
import reportsRoutes from "./routes/reports.js";
import uploadsRoutes from "./routes/uploads.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty" } }
        : true,
  });

  await app.register(envPlugin, { env });
  await app.register(dbPlugin, { connectionString: env.DATABASE_URL });
  await app.register(redisPlugin, { url: env.REDIS_URL });
  await app.register(storagePlugin, {
    config: {
      endpoint: env.OBJECT_STORAGE_ENDPOINT,
      region: env.OBJECT_STORAGE_REGION,
      bucket: env.OBJECT_STORAGE_BUCKET,
      accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
      forcePathStyle: env.OBJECT_STORAGE_FORCE_PATH_STYLE,
    },
  });
  await app.register(queuePlugin, { redisUrl: env.REDIS_URL });
  await app.register(searchPlugin, { host: env.MEILI_URL, apiKey: env.MEILI_MASTER_KEY });

  await app.register(cors, {
    origin: env.WEBAUTHN_ORIGIN,
    credentials: true,
  });
  // En-têtes de sécurité de base (X-Content-Type-Options, X-Frame-Options,
  // Referrer-Policy, HSTS...). API pure JSON : pas de CSP applicable ici,
  // désactivée pour éviter un en-tête sans effet réel (voir infra/caddy/Caddyfile
  // pour la CSP côté web, qui sert du HTML). Phase 5 durcissement, voir
  // plan/10-securite-confidentialite-conformite.md.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: false, // activé route par route (voir routes/auth.ts) — §6.5
  });

  // Doit être enregistré AVANT les plugins de routes ci-dessous : Fastify
  // encapsule chaque `.register()` dans son propre contexte, et un handler
  // posé sur la racine après coup ne redescend pas dans les contextes enfants
  // déjà créés (vérifié : sans ce point précis, register/login remontaient en
  // 500 brut avec le détail Zod complet exposé au client au lieu d'un 400 propre).
  app.setErrorHandler((rawError: unknown, request, reply) => {
    if (rawError instanceof ZodError) {
      return reply.code(400).send({ error: "invalid_input", details: rawError.flatten() });
    }
    const error = rawError instanceof Error ? rawError : new Error(String(rawError));
    request.log.error(error);
    const statusCode =
      "statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;
    return reply.code(statusCode).send({ error: statusCode >= 500 ? "internal_error" : error.message });
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(uploadsRoutes);
  await app.register(recordingsRoutes);
  await app.register(reportsRoutes);
  await app.register(geocodeRoutes);

  return app;
}

import type { FastifyReply, FastifyRequest } from "fastify";
import type { Redis } from "ioredis";
import { getSessionUserId, SESSION_COOKIE_NAME } from "./session.js";

/**
 * Exige une session valide et répond 401 sinon (voir plan/06-authentification-sans-mot-de-passe.md §6.5).
 * Retourne `null` après avoir déjà envoyé la réponse d'erreur — l'appelant doit
 * simplement `return` sans rien renvoyer d'autre dans ce cas.
 */
export async function requireUserId(
  request: FastifyRequest,
  reply: FastifyReply,
  redis: Redis
): Promise<string | null> {
  const sessionId = request.cookies[SESSION_COOKIE_NAME];
  if (!sessionId) {
    reply.code(401).send({ error: "unauthenticated" });
    return null;
  }
  const userId = await getSessionUserId(redis, sessionId);
  if (!userId) {
    reply.code(401).send({ error: "unauthenticated" });
    return null;
  }
  return userId;
}

/** Variante silencieuse (pas de 401) pour les routes accessibles sans session — voir GET /recordings/:id. */
export async function optionalUserId(request: FastifyRequest, redis: Redis): Promise<string | null> {
  const sessionId = request.cookies[SESSION_COOKIE_NAME];
  if (!sessionId) return null;
  return getSessionUserId(redis, sessionId);
}

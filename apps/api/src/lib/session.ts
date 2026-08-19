import { randomBytes } from "node:crypto";
import type { Redis } from "ioredis";

/**
 * Sessions révocables stockées côté serveur dans Redis — voir
 * plan/06-authentification-sans-mot-de-passe.md §6.5 ("stocké côté serveur
 * dans Redis (révocable immédiatement — utile en cas de perte d'appareil)").
 */

const SESSION_KEY_PREFIX = "session:";

export async function createSession(
  redis: Redis,
  userId: string,
  ttlSeconds: number
): Promise<string> {
  const sessionId = randomBytes(32).toString("base64url");
  await redis.set(SESSION_KEY_PREFIX + sessionId, userId, "EX", ttlSeconds);
  return sessionId;
}

export async function getSessionUserId(redis: Redis, sessionId: string): Promise<string | null> {
  return redis.get(SESSION_KEY_PREFIX + sessionId);
}

export async function destroySession(redis: Redis, sessionId: string): Promise<void> {
  await redis.del(SESSION_KEY_PREFIX + sessionId);
}

export const SESSION_COOKIE_NAME = "arborisis_session";

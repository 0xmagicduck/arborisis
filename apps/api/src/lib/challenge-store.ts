import type { Redis } from "ioredis";

/**
 * Challenge WebAuthn en attente entre `.../start` et `.../finish` — TTL court
 * (5 min), stocké dans Redis plutôt qu'en session car il précède l'existence
 * de toute session (voir plan/06-authentification-sans-mot-de-passe.md §6.2-6.3).
 */

const CHALLENGE_TTL_SECONDS = 5 * 60;

function key(kind: "register" | "login", handle: string): string {
  return `webauthn:${kind}:${handle}`;
}

export async function putChallenge(
  redis: Redis,
  kind: "register" | "login",
  handle: string,
  challenge: string
): Promise<void> {
  await redis.set(key(kind, handle), challenge, "EX", CHALLENGE_TTL_SECONDS);
}

export async function takeChallenge(
  redis: Redis,
  kind: "register" | "login",
  handle: string
): Promise<string | null> {
  const k = key(kind, handle);
  const challenge = await redis.get(k);
  if (challenge) await redis.del(k);
  return challenge;
}

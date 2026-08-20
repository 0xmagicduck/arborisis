import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { users, type Db } from "@arborisis/db";
import { requireUserId } from "./auth.js";

/**
 * Revue des signalements (plan/10-securite-confidentialite-conformite.md §10.3) :
 * pas de rôle admin en base, volontairement — un utilisateur est "admin" si
 * son handle figure dans ADMIN_HANDLES (env). Simplification assumée en
 * l'absence d'écran d'administration dédié dans le MVP ; suffisant à ce stade
 * pour qu'une revue manuelle légère (§10.3) soit réellement possible plutôt
 * que de laisser les signalements invisibles jusqu'à un futur système de rôles.
 *
 * Retourne `null` après avoir déjà envoyé la réponse d'erreur (401/403) —
 * l'appelant doit simplement `return` sans rien renvoyer d'autre.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  db: Db,
  redis: Parameters<typeof requireUserId>[2],
  adminHandles: string[]
): Promise<string | null> {
  const userId = await requireUserId(request, reply, redis);
  if (!userId) return null; // requireUserId a déjà envoyé le 401

  if (adminHandles.length === 0) {
    reply.code(403).send({ error: "moderation_not_configured" });
    return null;
  }

  const [user] = await db.select({ handle: users.handle }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !adminHandles.includes(user.handle)) {
    reply.code(403).send({ error: "forbidden" });
    return null;
  }
  return userId;
}

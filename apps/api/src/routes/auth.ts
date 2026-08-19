import type { FastifyPluginAsync } from "fastify";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { users, webauthnCredentials, recoveryCodes } from "@arborisis/db";
import { handleSchema, loginStartInputSchema, registerStartInputSchema } from "@arborisis/shared-types";
import { z } from "zod";
import { putChallenge, takeChallenge } from "../lib/challenge-store.js";
import { createSession, destroySession, getSessionUserId, SESSION_COOKIE_NAME } from "../lib/session.js";
import { generateRecoveryCodes, hashRecoveryCode } from "../lib/recovery-codes.js";

// @simplewebauthn/server (v11) n'exporte plus le type des transports
// ('usb' | 'nfc' | 'ble' | 'internal' | 'hybrid'…) à son sommet — dérivé
// localement plutôt que de dépendre de @simplewebauthn/types (dépréciée en
// v11, voir avertissement pnpm install) pour un simple type de chaîne.
type AuthenticatorTransportFuture = "usb" | "nfc" | "ble" | "internal" | "hybrid" | "cable" | "smart-card";

/**
 * Auth WebAuthn de bout en bout — voir plan/06-authentification-sans-mot-de-passe.md.
 * Aucun email, aucun mot de passe : seulement un pseudo public + une cérémonie
 * WebAuthn (§6.2-6.3), sessions révocables en Redis (§6.5), codes de récupération (§6.4).
 */

const registrationFinishSchema = z.object({
  handle: handleSchema,
  response: z.any(), // forme validée par @simplewebauthn/server, pas dupliquée ici
});

const loginFinishSchema = z.object({
  handle: handleSchema,
  response: z.any(),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const { db, redis } = fastify;
  const env = fastify.env;

  // Rate limiting dédié : pas de mot de passe à "bruteforcer", mais protège
  // contre l'énumération de pseudos et l'abus général — voir 06.5.
  const authRateLimit = { max: 10, timeWindow: "1 minute" as const };

  fastify.post(
    "/auth/register/start",
    { config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const { handle } = registerStartInputSchema.parse(request.body);

      const existing = await db.query.users.findFirst({ where: eq(users.handle, handle) });
      if (existing) {
        return reply.code(409).send({ error: "handle_taken" });
      }

      const options = await generateRegistrationOptions({
        rpName: env.WEBAUTHN_RP_NAME,
        rpID: env.WEBAUTHN_RP_ID,
        userName: handle,
        attestationType: "none",
        excludeCredentials: [],
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      await putChallenge(redis, "register", handle, options.challenge);
      return reply.send(options);
    }
  );

  fastify.post(
    "/auth/register/finish",
    { config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const { handle, response } = registrationFinishSchema.parse(request.body);

      const expectedChallenge = await takeChallenge(redis, "register", handle);
      if (!expectedChallenge) {
        return reply.code(400).send({ error: "challenge_expired" });
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: env.WEBAUTHN_ORIGIN,
        expectedRPID: env.WEBAUTHN_RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return reply.code(400).send({ error: "verification_failed" });
      }

      const { credential } = verification.registrationInfo;

      // Re-vérifié ici (pas seulement à /start) : deux inscriptions concurrentes
      // sur le même pseudo se règlent via la contrainte unique en base plutôt
      // qu'une simple 500 non gérée.
      let user;
      try {
        [user] = await db.insert(users).values({ handle }).returning();
      } catch (err) {
        if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
          return reply.code(409).send({ error: "handle_taken" });
        }
        throw err;
      }
      if (!user) {
        return reply.code(500).send({ error: "user_creation_failed" });
      }

      await db.insert(webauthnCredentials).values({
        userId: user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        signCount: credential.counter,
        transports: credential.transports ?? [],
        deviceLabel: "Authentificateur principal",
      });

      // 10 codes de récupération à usage unique, affichés une seule fois — voir 06.2.
      const plainCodes = generateRecoveryCodes(10);
      await db.insert(recoveryCodes).values(
        await Promise.all(
          plainCodes.map(async (code) => ({
            userId: user.id,
            codeHash: await hashRecoveryCode(code),
          }))
        )
      );

      const sessionId = await createSession(redis, user.id, env.SESSION_TTL_SECONDS);
      reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: env.SESSION_TTL_SECONDS,
      });

      return reply.send({ user, recoveryCodes: plainCodes });
    }
  );

  fastify.post(
    "/auth/login/start",
    { config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const { handle } = loginStartInputSchema.parse(request.body);

      const user = await db.query.users.findFirst({ where: eq(users.handle, handle) });
      // Réponse identique que l'utilisateur existe ou non, pour ne pas
      // permettre l'énumération de pseudos via ce endpoint — voir 06.5.
      const credentials = user
        ? await db.query.webauthnCredentials.findMany({ where: eq(webauthnCredentials.userId, user.id) })
        : [];

      const options = await generateAuthenticationOptions({
        rpID: env.WEBAUTHN_RP_ID,
        userVerification: "preferred",
        allowCredentials: credentials.map((c) => ({
          id: c.credentialId,
          transports: c.transports as AuthenticatorTransportFuture[],
        })),
      });

      await putChallenge(redis, "login", handle, options.challenge);
      return reply.send(options);
    }
  );

  fastify.post(
    "/auth/login/finish",
    { config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const { handle, response } = loginFinishSchema.parse(request.body);

      const expectedChallenge = await takeChallenge(redis, "login", handle);
      if (!expectedChallenge) {
        return reply.code(400).send({ error: "challenge_expired" });
      }

      const user = await db.query.users.findFirst({ where: eq(users.handle, handle) });
      if (!user) {
        return reply.code(400).send({ error: "verification_failed" });
      }

      const credentialRecord = await db.query.webauthnCredentials.findFirst({
        where: eq(webauthnCredentials.credentialId, response.id),
      });
      if (!credentialRecord || credentialRecord.userId !== user.id) {
        return reply.code(400).send({ error: "verification_failed" });
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: env.WEBAUTHN_ORIGIN,
        expectedRPID: env.WEBAUTHN_RP_ID,
        credential: {
          id: credentialRecord.credentialId,
          publicKey: new Uint8Array(Buffer.from(credentialRecord.publicKey, "base64url")),
          counter: credentialRecord.signCount,
          transports: credentialRecord.transports as AuthenticatorTransportFuture[],
        },
      });

      if (!verification.verified) {
        return reply.code(400).send({ error: "verification_failed" });
      }

      // Compteur anti-clonage — voir 06.3.
      await db
        .update(webauthnCredentials)
        .set({ signCount: verification.authenticationInfo.newCounter })
        .where(eq(webauthnCredentials.id, credentialRecord.id));

      const sessionId = await createSession(redis, user.id, env.SESSION_TTL_SECONDS);
      reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: env.SESSION_TTL_SECONDS,
      });

      return reply.send({ user });
    }
  );

  fastify.post("/auth/logout", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      await destroySession(redis, sessionId);
      reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    }
    return reply.send({ ok: true });
  });

  fastify.get("/auth/me", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) return reply.code(401).send({ error: "unauthenticated" });

    const userId = await getSessionUserId(redis, sessionId);
    if (!userId) return reply.code(401).send({ error: "unauthenticated" });

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return reply.code(401).send({ error: "unauthenticated" });

    return reply.send({ user });
  });
};

export default authRoutes;

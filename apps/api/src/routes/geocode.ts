import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

/**
 * Proxy vers Photon (géocodage) — Phase 5, voir plan/07-carte-open-source.md
 * §7.5 et infra/photon/README.md. Le navigateur appelait directement
 * l'instance Photon jusqu'en Phase 4 (bootstrap public, CORS ouvert) ; depuis
 * l'auto-hébergement, l'instance de production vit sur un réseau privé sans
 * IP publique (pas de service de géocodage non-authentifié exposé à
 * Internet) — seule l'API peut donc l'atteindre, d'où ce proxy minimal.
 */
const geocodeRoutes: FastifyPluginAsync = async (fastify) => {
  const env = fastify.env;

  fastify.get("/geocode", async (request, reply) => {
    const { q } = z.object({ q: z.string().min(2).max(200) }).parse(request.query);

    const url = `${env.PHOTON_URL}?q=${encodeURIComponent(q)}&limit=5`;
    const res = await fetch(url);
    if (!res.ok) {
      return reply.code(502).send({ error: "geocoding_upstream_error" });
    }
    const body = await res.json();
    // Réponse Photon relayée telle quelle (GeoJSON FeatureCollection) — le
    // client (apps/web/lib/geocoding.ts) sait déjà la parser, aucune
    // transformation nécessaire côté proxy.
    return reply.send(body);
  });
};

export default geocodeRoutes;

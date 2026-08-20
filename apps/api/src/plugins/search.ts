import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import {
  createSearchClient,
  ensureRecordingsIndex,
  type MeiliSearch,
  type RecordingSearchDocument,
} from "@arborisis/search";

declare module "fastify" {
  interface FastifyInstance {
    // Pas `search` : Fastify déclare déjà `search` comme raccourci de route
    // pour la méthode HTTP SEARCH (`fastify.search(path, opts, handler)`,
    // voir RouteShorthandMethod) — collision de type détectée à la
    // compilation ("Subsequent property declarations must have the same
    // type"), corrigée en renommant la décoration plutôt qu'en essayant de
    // faire cohabiter les deux sous le même nom.
    meilisearch: MeiliSearch;
  }
}

/**
 * Index Meilisearch "recordings" — voir plan/08-donnees-et-recherche.md §8.3.
 * `ensureRecordingsIndex` est idempotent (crée l'index + réapplique ses
 * réglages), appelé au démarrage plutôt que via une migration séparée — voir
 * @arborisis/search pour le détail.
 */
const searchPlugin: FastifyPluginAsync<{ host: string; apiKey: string }> = async (fastify, opts) => {
  const client = createSearchClient(opts);
  await ensureRecordingsIndex(client);
  fastify.decorate("meilisearch", client);
};

export default fp(searchPlugin, { name: "search" });
export type { RecordingSearchDocument };

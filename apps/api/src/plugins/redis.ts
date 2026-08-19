import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { Redis } from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

const redisPlugin: FastifyPluginAsync<{ url: string }> = async (fastify, opts) => {
  const redis = new Redis(opts.url, { lazyConnect: true });
  await redis.connect();
  fastify.decorate("redis", redis);
  fastify.addHook("onClose", async () => {
    await redis.quit();
  });
};

export default fp(redisPlugin, { name: "redis" });

import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { Env } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    env: Env;
  }
}

const envPlugin: FastifyPluginAsync<{ env: Env }> = async (fastify, opts) => {
  fastify.decorate("env", opts.env);
};

export default fp(envPlugin, { name: "env" });

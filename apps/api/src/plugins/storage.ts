import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { createStorageClient, type S3Client, type StorageConfig } from "@arborisis/storage";

export interface StorageDecoration {
  client: S3Client;
  bucket: string;
}

declare module "fastify" {
  interface FastifyInstance {
    storage: StorageDecoration;
  }
}

const storagePlugin: FastifyPluginAsync<{ config: StorageConfig }> = async (fastify, opts) => {
  const client = createStorageClient(opts.config);
  fastify.decorate("storage", { client, bucket: opts.config.bucket });
};

export default fp(storagePlugin, { name: "storage" });

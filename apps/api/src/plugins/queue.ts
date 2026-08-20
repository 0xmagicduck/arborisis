import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { createPublishRecordingQueue, type PublishRecordingJobData } from "@arborisis/queue";
import type { Queue } from "bullmq";

declare module "fastify" {
  interface FastifyInstance {
    publishQueue: Queue<PublishRecordingJobData>;
  }
}

const queuePlugin: FastifyPluginAsync<{ redisUrl: string }> = async (fastify, opts) => {
  const publishQueue = createPublishRecordingQueue(opts.redisUrl);
  fastify.decorate("publishQueue", publishQueue);
  fastify.addHook("onClose", async () => {
    await publishQueue.close();
  });
};

export default fp(queuePlugin, { name: "queue" });

import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config.js";

/** Voir plan/05-stockage-audio-internet-archive.md §5.3 (pipeline upload → publication). */
export const PUBLISH_RECORDING_QUEUE = "publish-recording";

export interface PublishRecordingJobData {
  recordingId: string;
}

export function createConnection() {
  return new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
}

export function createPublishRecordingQueue() {
  return new Queue<PublishRecordingJobData>(PUBLISH_RECORDING_QUEUE, {
    connection: createConnection(),
    defaultJobOptions: {
      // Retry avec backoff exponentiel — voir plan/05 §5.6.
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
    },
  });
}

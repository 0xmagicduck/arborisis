import { Queue } from "bullmq";
import { Redis } from "ioredis";

/** Voir plan/05-stockage-audio-internet-archive.md §5.3 (pipeline upload → publication). */
export const PUBLISH_RECORDING_QUEUE = "publish-recording";

export interface PublishRecordingJobData {
  recordingId: string;
  /** Clé Object Storage du fichier brut déposé en staging (voir @arborisis/storage). */
  stagingKey: string;
  /** Nom de fichier original tel qu'uploadé — utilisé pour déduire l'extension de la copie pérenne. */
  originalFilename: string;
}

export function createRedisConnection(redisUrl: string): Redis {
  // maxRetriesPerRequest: null — requis par BullMQ pour les connexions
  // utilisées en blocking commands (Worker), voir doc BullMQ.
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

export function createPublishRecordingQueue(redisUrl: string): Queue<PublishRecordingJobData> {
  return new Queue<PublishRecordingJobData>(PUBLISH_RECORDING_QUEUE, {
    connection: createRedisConnection(redisUrl),
    defaultJobOptions: {
      // Retry avec backoff exponentiel — voir plan/05 §5.6.
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
    },
  });
}

import { eq } from "drizzle-orm";
import { Worker } from "bullmq";
import { createDb, recordings } from "@arborisis/db";
import { createRedisConnection, PUBLISH_RECORDING_QUEUE, type PublishRecordingJobData } from "@arborisis/queue";
import { createStorageClient } from "@arborisis/storage";
import { config } from "./config.js";
import { processPublishRecording, type PublishDeps } from "./jobs/publish-recording.js";

const db = createDb(config.DATABASE_URL);
const storage = createStorageClient(config.storage);

const deps: PublishDeps = {
  db,
  storage,
  bucket: config.storage.bucket,
  archiveToIA: config.ARCHIVE_TO_IA,
  ffmpegPath: config.FFMPEG_PATH,
  ffprobePath: config.FFPROBE_PATH,
};

const worker = new Worker<PublishRecordingJobData>(
  PUBLISH_RECORDING_QUEUE,
  (job) => processPublishRecording(job, deps),
  { connection: createRedisConnection(config.REDIS_URL) }
);

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} (${job.data.recordingId}) publié`);
});

worker.on("failed", (job, err) => {
  const attemptsMade = job?.attemptsMade ?? 0;
  const maxAttempts = job?.opts.attempts ?? 1;
  console.error(
    `[worker] job ${job?.id} (${job?.data.recordingId}) en échec (tentative ${attemptsMade}/${maxAttempts}):`,
    err.message
  );

  // Échec persistant après épuisement des retries — voir plan/05 §5.6
  // ("status = 'failed', notification visible sur le profil de l'auteur").
  if (job && attemptsMade >= maxAttempts) {
    db.update(recordings)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(recordings.id, job.data.recordingId))
      .catch((updateErr) => {
        console.error(
          `[worker] impossible de marquer l'enregistrement ${job.data.recordingId} comme "failed":`,
          updateErr
        );
      });
  }
});

console.log(`[worker] écoute la file "${PUBLISH_RECORDING_QUEUE}"`);

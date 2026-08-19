import { Worker } from "bullmq";
import { processPublishRecording } from "./jobs/publish-recording.js";
import { createConnection, PUBLISH_RECORDING_QUEUE, type PublishRecordingJobData } from "./queue.js";

const worker = new Worker<PublishRecordingJobData>(
  PUBLISH_RECORDING_QUEUE,
  processPublishRecording,
  { connection: createConnection() }
);

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} (${job.data.recordingId}) publié`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} (${job?.data.recordingId}) en échec:`, err.message);
});

console.log(`[worker] écoute la file "${PUBLISH_RECORDING_QUEUE}"`);

import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { recordings, type Db } from "@arborisis/db";
import type { PublishRecordingJobData } from "@arborisis/queue";
import {
  deleteObject,
  getObjectStream,
  originalKey,
  proxyKey,
  putObjectFromFile,
  type S3Client,
} from "@arborisis/storage";
import { computeWaveformPeaks, probeAudio, transcodeToOpus } from "../lib/audio.js";

/**
 * Job "publish-recording" — voir plan/05-stockage-audio-internet-archive.md §5.3 :
 * ffprobe (validation) → ffmpeg (transcodage proxy Opus) → peaks waveform →
 * dépôt Object Storage (originals/ + proxy/) → publication.
 *
 * Étape "push IAS3" : gardée en no-op tant que `ARCHIVE_TO_IA=false` (mode
 * intérimaire, voir plan/05 §5.10) — activer le flag plus tard n'exigera
 * aucune migration ni réécriture de ce fichier, seulement l'implémentation
 * du bloc ci-dessous.
 */

const WAVEFORM_BUCKET_COUNT = 500; // résolution de la waveform affichée (RecordingDetail)

export interface PublishDeps {
  db: Db;
  storage: S3Client;
  bucket: string;
  archiveToIA: boolean;
  ffmpegPath: string;
  ffprobePath: string;
}

export async function processPublishRecording(
  job: Job<PublishRecordingJobData>,
  deps: PublishDeps
): Promise<void> {
  const { recordingId, stagingKey, originalFilename } = job.data;
  const { db, storage, bucket, archiveToIA, ffmpegPath, ffprobePath } = deps;

  const workDir = await mkdtemp(path.join(tmpdir(), "arborisis-publish-"));
  const extension = path.extname(originalFilename) || ".bin";
  const localOriginalPath = path.join(workDir, `original${extension}`);
  const localProxyPath = path.join(workDir, "proxy.opus");

  try {
    // 1. Récupère le fichier déposé en staging.
    const staged = await getObjectStream(storage, bucket, stagingKey);
    await pipeline(staged, createWriteStream(localOriginalPath));

    // 2. ffprobe — validation.
    const probe = await probeAudio(ffprobePath, localOriginalPath);
    const audioStream = probe.streams.find((s) => s.codec_type === "audio");
    if (!audioStream) {
      throw new Error("fichier invalide : aucun flux audio détecté (ffprobe)");
    }
    const durationSeconds = Math.round(
      Number(probe.format.duration ?? audioStream.duration ?? 0)
    );
    const sampleRate = audioStream.sample_rate ?? null;
    const format = probe.format.format_name ?? null;

    // 3. ffmpeg — transcodage du proxy de lecture rapide (Opus 128kbps, voir §5.9).
    await transcodeToOpus(ffmpegPath, localOriginalPath, localProxyPath);

    // 4. Peaks waveform (affichage RecordingDetail).
    const waveformPeaks = await computeWaveformPeaks(ffmpegPath, localOriginalPath, WAVEFORM_BUCKET_COUNT);

    // 5. Dépôt sur Object Storage — originals/ (copie pérenne, mode intérimaire
    // §5.10) et proxy/ (lecture rapide), puis purge du staging.
    const oKey = originalKey(recordingId, extension);
    const pKey = proxyKey(recordingId);
    await putObjectFromFile(storage, bucket, oKey, localOriginalPath);
    await putObjectFromFile(storage, bucket, pKey, localProxyPath);
    await deleteObject(storage, bucket, stagingKey);

    if (archiveToIA) {
      // TODO Phase 2 (post seuil IA, voir plan/05 §5.10) : PUT IAS3 + polling
      // /metadata/{identifier}, puis renseigner ia_identifier / ia_item_url.
      throw new Error("ARCHIVE_TO_IA=true mais l'intégration IAS3 n'est pas encore implémentée");
    }

    await db
      .update(recordings)
      .set({
        status: "published",
        originalKey: oKey,
        proxyKey: pKey,
        durationSeconds,
        sampleRate,
        format,
        waveformPeaks,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, recordingId));
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

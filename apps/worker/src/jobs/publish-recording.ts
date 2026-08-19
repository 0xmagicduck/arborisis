import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { createDb, recordings } from "@arborisis/db";
import { config } from "../config.js";
import type { PublishRecordingJobData } from "../queue.js";

const db = createDb(config.DATABASE_URL);

/**
 * Job "publish-recording" — voir plan/05-stockage-audio-internet-archive.md §5.3.
 *
 * Étapes ffprobe/ffmpeg/waveform : **Phase 2** (pipeline d'upload et
 * archivage), pas encore implémentées ici — ce module pose la structure du
 * job et le point d'extension IA.
 *
 * Étape "push IAS3" : gardée en no-op tant que `ARCHIVE_TO_IA=false` (mode
 * intérimaire, voir plan/05 §5.10) — activer le flag plus tard n'exigera
 * aucune migration ni réécriture de ce fichier, seulement l'implémentation
 * du bloc ci-dessous.
 */
export async function processPublishRecording(job: Job<PublishRecordingJobData>): Promise<void> {
  const { recordingId } = job.data;

  // TODO Phase 2 : ffprobe (validation) + ffmpeg (transcodage) + peaks
  // waveform, dépôt du proxy sur Object Storage (préfixe proxy/).

  if (config.ARCHIVE_TO_IA) {
    // TODO Phase 2 (post seuil IA, voir plan/05 §5.10) : PUT IAS3 + polling
    // /metadata/{identifier}, puis renseigner ia_identifier / ia_item_url.
    throw new Error("ARCHIVE_TO_IA=true mais l'intégration IAS3 n'est pas encore implémentée");
  }

  await db
    .update(recordings)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(recordings.id, recordingId));
}

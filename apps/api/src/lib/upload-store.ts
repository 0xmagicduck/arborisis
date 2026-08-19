import type { Redis } from "ioredis";

/**
 * Métadonnées d'un upload staged, entre POST /uploads/presign et POST /recordings
 * — même idiome que challenge-store.ts (TTL, "take" = lecture + suppression,
 * empêche de créer deux enregistrements à partir du même upload). Voir
 * plan/05-stockage-audio-internet-archive.md §5.3.
 */

const UPLOAD_TTL_SECONDS = 60 * 60; // 1h pour uploader le fichier puis créer l'enregistrement

export interface StagedUpload {
  key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  userId: string;
}

function redisKey(uploadId: string): string {
  return `upload:${uploadId}`;
}

export async function putStagedUpload(redis: Redis, uploadId: string, upload: StagedUpload): Promise<void> {
  await redis.set(redisKey(uploadId), JSON.stringify(upload), "EX", UPLOAD_TTL_SECONDS);
}

export async function takeStagedUpload(redis: Redis, uploadId: string): Promise<StagedUpload | null> {
  const k = redisKey(uploadId);
  const raw = await redis.get(k);
  if (!raw) return null;
  await redis.del(k);
  return JSON.parse(raw) as StagedUpload;
}

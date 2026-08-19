import { createReadStream } from "node:fs";
import type { Readable } from "node:stream";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** URL pré-signée pour un upload direct client → Object Storage — voir plan/05 §5.3 étape 1. */
export async function presignPutUrl(
  client: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  contentLength: number,
  expiresInSeconds: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * URL pré-signée pour la lecture — le container est privé (voir Terraform,
 * `container_read = ""`), donc `originalUrl`/`streamingUrl` ne sont jamais
 * stockées telles quelles en base : seules les clés le sont, et une URL de
 * lecture temporaire est recalculée à chaque réponse API (voir
 * apps/api/src/routes/recordings.ts). À remplacer par une URL publique stable
 * si/quand un container dédié public est provisionné (TODO déjà noté dans
 * infra/terraform/main.tf).
 */
export async function presignGetUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expiresInSeconds: number
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/** `null` si l'objet n'existe pas (au lieu de laisser remonter l'erreur 404 du SDK). */
export async function headObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<{ contentLength?: number } | null> {
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { contentLength: res.ContentLength };
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function getObjectStream(client: S3Client, bucket: string, key: string): Promise<Readable> {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`Objet vide ou introuvable : ${key}`);
  return res.Body as Readable;
}

/**
 * Upload multipart robuste (via `@aws-sdk/lib-storage`) plutôt qu'un simple
 * `PutObjectCommand` avec un stream fichier : évite d'avoir à connaître la
 * taille exacte à l'avance, adapté aux fichiers audio potentiellement volumineux
 * (proxy transcodé + original) déposés par le worker.
 */
export async function putObjectFromFile(
  client: S3Client,
  bucket: string,
  key: string,
  filePath: string,
  contentType?: string
): Promise<void> {
  const upload = new Upload({
    client,
    params: { Bucket: bucket, Key: key, Body: createReadStream(filePath), ContentType: contentType },
  });
  await upload.done();
}

export async function copyObject(
  client: S3Client,
  bucket: string,
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: destinationKey,
      CopySource: `/${bucket}/${sourceKey}`,
    })
  );
}

export async function deleteObject(client: S3Client, bucket: string, key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const metadata = (err as { $metadata?: { httpStatusCode?: number } }).$metadata;
  return metadata?.httpStatusCode === 404;
}

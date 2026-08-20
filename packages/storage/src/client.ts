import { S3Client } from "@aws-sdk/client-s3";
import type { StorageConfig } from "./config.js";

export function createStorageClient(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

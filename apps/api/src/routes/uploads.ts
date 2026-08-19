import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { presignUploadInputSchema } from "@arborisis/shared-types";
import { presignPutUrl, stagingKey } from "@arborisis/storage";
import { requireUserId } from "../lib/auth.js";
import { putStagedUpload } from "../lib/upload-store.js";

/** Étape 1 du flux Ajouter — upload direct vers Object Storage via URL pré-signée, voir plan/05 §5.3. */
const UPLOAD_URL_TTL_SECONDS = 15 * 60; // 15 min pour effectuer l'upload une fois l'URL émise

const uploadsRoutes: FastifyPluginAsync = async (fastify) => {
  const { redis, storage, env } = fastify;

  fastify.post(
    "/uploads/presign",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const userId = await requireUserId(request, reply, redis);
      if (!userId) return;

      const input = presignUploadInputSchema.parse(request.body);
      if (input.sizeBytes > env.MAX_UPLOAD_BYTES) {
        return reply.code(413).send({ error: "file_too_large", maxBytes: env.MAX_UPLOAD_BYTES });
      }

      const uploadId = randomUUID();
      const key = stagingKey(uploadId, input.filename);

      const uploadUrl = await presignPutUrl(
        storage.client,
        storage.bucket,
        key,
        input.contentType,
        input.sizeBytes,
        UPLOAD_URL_TTL_SECONDS
      );

      await putStagedUpload(redis, uploadId, {
        key,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        userId,
      });

      return reply.send({
        uploadId,
        uploadUrl,
        expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
      });
    }
  );
};

export default uploadsRoutes;

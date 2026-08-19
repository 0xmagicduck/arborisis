-- Le container Object Storage est privé (Terraform, container_read = "") :
-- on ne stocke plus d'URL en base mais la clé Object Storage, l'API
-- recalculant une URL de lecture pré-signée à chaque réponse — voir
-- @arborisis/storage `presignGetUrl` et packages/db/src/schema.ts.
ALTER TABLE "recordings" RENAME COLUMN "original_url" TO "original_key";--> statement-breakpoint
ALTER TABLE "recordings" RENAME COLUMN "streaming_url" TO "proxy_key";

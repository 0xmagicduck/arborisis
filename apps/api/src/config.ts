import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  // WebAuthn est lié à l'origine (rpID) — voir plan/06-authentification-sans-mot-de-passe.md §6.1.
  // En dev, rpID=localhost et origin=http://localhost:3000 (le web sert le formulaire).
  WEBAUTHN_RP_ID: z.string().min(1).default("localhost"),
  WEBAUTHN_RP_NAME: z.string().min(1).default("Arborisis"),
  WEBAUTHN_ORIGIN: z.string().url().default("http://localhost:3000"),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7), // 7 jours, voir 06.5
  // Flag mode intérimaire — voir plan/05-stockage-audio-internet-archive.md §5.10.
  ARCHIVE_TO_IA: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  // Object Storage S3-compatible (MinIO en dev, Infomaniak Swift en prod) —
  // voir plan/05 §5.10 et plan/04-infra-infomaniak.md §4.1.
  OBJECT_STORAGE_ENDPOINT: z.string().url(),
  // "us-east-1" par défaut, pas la région OpenStack réelle — voir
  // @arborisis/storage StorageConfig (passerelle S3-compat Infomaniak testée
  // en conditions réelles : rejette toute autre région pour la signature SigV4).
  OBJECT_STORAGE_REGION: z.string().min(1).default("us-east-1"),
  OBJECT_STORAGE_BUCKET: z.string().min(1),
  OBJECT_STORAGE_ACCESS_KEY_ID: z.string().min(1),
  OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  OBJECT_STORAGE_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(500 * 1024 * 1024),
  // Meilisearch (Phase 4) — voir @arborisis/search et plan/08 §8.3.
  MEILI_URL: z.string().url().default("http://localhost:7700"),
  MEILI_MASTER_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}

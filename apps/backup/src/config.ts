import { z } from "zod";

/**
 * Sauvegarde PostgreSQL — voir plan/04-infra-infomaniak.md §4.5 et
 * plan/10-securite-confidentialite-conformite.md §10.4 (RPO 24h, rétention
 * 30 jours glissants + 12 mensuelles).
 *
 * Réutilise volontairement les mêmes variables OBJECT_STORAGE_* que
 * apps/api/apps/worker (même container, préfixe `backups/` dédié) plutôt que
 * d'introduire un second jeu de credentials.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OBJECT_STORAGE_ENDPOINT: z.string().url(),
  OBJECT_STORAGE_REGION: z.string().min(1).default("us-east-1"),
  OBJECT_STORAGE_BUCKET: z.string().min(1),
  OBJECT_STORAGE_ACCESS_KEY_ID: z.string().min(1),
  OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  OBJECT_STORAGE_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Chiffrement symétrique GPG (AES256) du dump avant dépôt — le container
  // Object Storage est déjà privé (voir packages/storage), mais un dump SQL
  // complet est plus sensible qu'un fichier audio individuel : défense en
  // profondeur en cas de fuite de credentials Object Storage.
  BACKUP_GPG_PASSPHRASE: z.string().min(16, "passphrase trop courte (16 caractères minimum)"),
  BACKUP_PREFIX: z.string().min(1).default("backups/postgres/"),
  BACKUP_RETENTION_DAILY_DAYS: z.coerce.number().int().positive().default(30),
  BACKUP_RETENTION_MONTHLY_COUNT: z.coerce.number().int().positive().default(12),
});

export type BackupEnv = z.infer<typeof envSchema>;

export function loadBackupEnv(): BackupEnv {
  return envSchema.parse(process.env);
}

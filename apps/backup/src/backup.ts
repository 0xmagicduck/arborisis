import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createStorageClient,
  deleteObject,
  listObjects,
  putObjectFromFile,
} from "@arborisis/storage";
import { loadBackupEnv } from "./config.js";
import { gpgEncrypt } from "./gpg.js";
import { pgEnvFromUrl } from "./pg.js";

const execFileAsync = promisify(execFile);

/**
 * Sauvegarde nocturne — voir plan/04 §4.5 et plan/10 §10.4 (RPO 24h).
 * pg_dump (format custom, compressé) → chiffrement GPG symétrique → dépôt sur
 * l'Object Storage → rétention (30 jours glissants, prunée séparément de la
 * copie mensuelle conservée 12 mois). Conçue pour tourner via cron/systemd
 * timer une fois par nuit (voir infra/docker-compose.yml pour le service
 * dédié — pas encore actif en production tant que l'app elle-même n'est pas
 * déployée, voir plan/TASKS.md).
 */
async function main() {
  const env = loadBackupEnv();
  const client = createStorageClient({
    endpoint: env.OBJECT_STORAGE_ENDPOINT,
    region: env.OBJECT_STORAGE_REGION,
    bucket: env.OBJECT_STORAGE_BUCKET,
    accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    forcePathStyle: env.OBJECT_STORAGE_FORCE_PATH_STYLE,
  });

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-"); // sûr dans une clé Object Storage
  const yearMonth = stamp.slice(0, 7); // "2026-08"

  const workDir = await mkdtemp(join(tmpdir(), "arborisis-backup-"));
  try {
    const dumpPath = join(workDir, "dump.pgcustom");
    const encryptedPath = join(workDir, "dump.pgcustom.gpg");

    console.log(`[backup] pg_dump → ${dumpPath}`);
    await execFileAsync("pg_dump", ["--format=custom", "--file", dumpPath], {
      env: { ...process.env, ...pgEnvFromUrl(env.DATABASE_URL) },
    });

    console.log("[backup] chiffrement GPG (AES256)");
    await gpgEncrypt(dumpPath, encryptedPath, env.BACKUP_GPG_PASSPHRASE);

    const dailyKey = `${env.BACKUP_PREFIX}daily/${stamp}.pgcustom.gpg`;
    console.log(`[backup] dépôt → ${dailyKey}`);
    await putObjectFromFile(client, env.OBJECT_STORAGE_BUCKET, dailyKey, encryptedPath, "application/octet-stream");

    // Copie mensuelle : si aucune sauvegarde n'existe encore pour ce mois
    // civil sous monthly/, celle-ci en devient la référence — pas besoin
    // d'attendre le 1er du mois pile (le cron peut manquer un jour).
    const monthlyPrefix = `${env.BACKUP_PREFIX}monthly/`;
    const monthlyObjects = await listObjects(client, env.OBJECT_STORAGE_BUCKET, monthlyPrefix);
    const hasThisMonth = monthlyObjects.some((o) => o.key.includes(yearMonth));
    if (!hasThisMonth) {
      const monthlyKey = `${monthlyPrefix}${yearMonth}.pgcustom.gpg`;
      console.log(`[backup] première sauvegarde du mois → copie vers ${monthlyKey}`);
      await putObjectFromFile(
        client,
        env.OBJECT_STORAGE_BUCKET,
        monthlyKey,
        encryptedPath,
        "application/octet-stream"
      );
    }

    await pruneRetention(client, env);
    console.log("[backup] terminé");
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function pruneRetention(
  client: Awaited<ReturnType<typeof createStorageClient>>,
  env: Awaited<ReturnType<typeof loadBackupEnv>>
) {
  const dailyPrefix = `${env.BACKUP_PREFIX}daily/`;
  const daily = await listObjects(client, env.OBJECT_STORAGE_BUCKET, dailyPrefix);
  const cutoff = Date.now() - env.BACKUP_RETENTION_DAILY_DAYS * 24 * 60 * 60 * 1000;
  for (const obj of daily) {
    if (obj.lastModified && obj.lastModified.getTime() < cutoff) {
      console.log(`[backup] rétention : suppression ${obj.key} (> ${env.BACKUP_RETENTION_DAILY_DAYS}j)`);
      await deleteObject(client, env.OBJECT_STORAGE_BUCKET, obj.key);
    }
  }

  const monthlyPrefix = `${env.BACKUP_PREFIX}monthly/`;
  const monthly = (await listObjects(client, env.OBJECT_STORAGE_BUCKET, monthlyPrefix)).sort((a, b) =>
    a.key.localeCompare(b.key)
  );
  const excess = monthly.length - env.BACKUP_RETENTION_MONTHLY_COUNT;
  for (let i = 0; i < excess; i++) {
    console.log(`[backup] rétention : suppression ${monthly[i]!.key} (au-delà de ${env.BACKUP_RETENTION_MONTHLY_COUNT} mensuelles)`);
    await deleteObject(client, env.OBJECT_STORAGE_BUCKET, monthly[i]!.key);
  }
}

main().catch((err) => {
  console.error("[backup] échec :", err);
  process.exit(1);
});

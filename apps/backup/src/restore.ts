import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createStorageClient, getObjectStream, listObjects } from "@arborisis/storage";
import { loadBackupEnv } from "./config.js";
import { gpgDecrypt } from "./gpg.js";
import { pgEnvFromUrl } from "./pg.js";

const execFileAsync = promisify(execFile);

/**
 * Script de restauration / test de restauration trimestriel — voir plan/10
 * §10.4. **Ne restaure JAMAIS sur DATABASE_URL** (la base de production) :
 * exige explicitement RESTORE_TARGET_DATABASE_URL, une base séparée (vide,
 * de test), pour ne jamais écraser accidentellement des données vivantes.
 *
 * Usage : RESTORE_TARGET_DATABASE_URL=postgres://... pnpm --filter @arborisis/backup restore [clé-objet]
 * Sans argument, restaure la sauvegarde daily/ la plus récente.
 */
async function main() {
  const env = loadBackupEnv();
  const targetUrl = process.env.RESTORE_TARGET_DATABASE_URL;
  if (!targetUrl) {
    throw new Error(
      "RESTORE_TARGET_DATABASE_URL manquant — la restauration doit cibler une base séparée de la production, jamais DATABASE_URL directement."
    );
  }
  if (targetUrl === env.DATABASE_URL) {
    throw new Error("RESTORE_TARGET_DATABASE_URL est identique à DATABASE_URL — refusé par sécurité.");
  }

  const client = createStorageClient({
    endpoint: env.OBJECT_STORAGE_ENDPOINT,
    region: env.OBJECT_STORAGE_REGION,
    bucket: env.OBJECT_STORAGE_BUCKET,
    accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    forcePathStyle: env.OBJECT_STORAGE_FORCE_PATH_STYLE,
  });

  const requestedKey = process.argv[2];
  const key = requestedKey ?? (await latestDailyKey(client, env));
  console.log(`[restore] sauvegarde choisie : ${key}`);

  const workDir = await mkdtemp(join(tmpdir(), "arborisis-restore-"));
  try {
    const encryptedPath = join(workDir, "dump.pgcustom.gpg");
    const dumpPath = join(workDir, "dump.pgcustom");

    console.log("[restore] téléchargement depuis l'Object Storage");
    const stream = await getObjectStream(client, env.OBJECT_STORAGE_BUCKET, key);
    await pipeline(stream, createWriteStream(encryptedPath));

    console.log("[restore] déchiffrement GPG");
    await gpgDecrypt(encryptedPath, dumpPath, env.BACKUP_GPG_PASSPHRASE);

    const targetDbName = new URL(targetUrl).pathname.replace(/^\//, "");
    console.log(`[restore] pg_restore vers la base cible "${targetDbName}" (--clean --if-exists)`);
    await execFileAsync(
      "pg_restore",
      ["--clean", "--if-exists", "--no-owner", "--dbname", targetDbName, dumpPath],
      { env: { ...process.env, ...pgEnvFromUrl(targetUrl) } }
    );

    await verifyRowCounts(targetUrl);
    console.log("[restore] terminé");
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function latestDailyKey(
  client: Awaited<ReturnType<typeof createStorageClient>>,
  env: Awaited<ReturnType<typeof loadBackupEnv>>
): Promise<string> {
  const objects = await listObjects(client, env.OBJECT_STORAGE_BUCKET, `${env.BACKUP_PREFIX}daily/`);
  if (objects.length === 0) throw new Error("Aucune sauvegarde daily/ trouvée.");
  objects.sort((a, b) => b.key.localeCompare(a.key)); // horodatage ISO dans la clé → tri lexicographique = tri chronologique
  return objects[0]!.key;
}

/**
 * Vérification d'intégrité basique (pas juste "pg_restore n'a pas planté") :
 * compte les lignes des tables principales pour confirmer que les données
 * sont réellement là — voir plan/10 §10.4 "vérifier l'intégrité".
 */
async function verifyRowCounts(targetUrl: string) {
  const targetDbName = new URL(targetUrl).pathname.replace(/^\//, "");
  const tables = ["users", "recordings", "webauthn_credentials", "reports"];
  const { stdout } = await execFileAsync(
    "psql",
    [
      "--tuples-only",
      "--dbname",
      targetDbName,
      "-c",
      `SELECT ${tables.map((t) => `(SELECT count(*) FROM ${t})`).join(", ")};`,
    ],
    { env: { ...process.env, ...pgEnvFromUrl(targetUrl) } }
  );
  console.log(`[restore] lignes restaurées (${tables.join(", ")}) : ${stdout.trim()}`);
}

main().catch((err) => {
  console.error("[restore] échec :", err);
  process.exit(1);
});

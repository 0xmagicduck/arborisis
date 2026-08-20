const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL manquant — voir infra/docker-compose.yml / .env");
}

// Mode intérimaire — voir plan/05-stockage-audio-internet-archive.md §5.10.
// Reste `false` tant que le seuil de 50 items publiés côté Internet Archive
// n'est pas atteignable ; ne change AUCUN comportement au-delà de cette étape.
const ARCHIVE_TO_IA = process.env.ARCHIVE_TO_IA === "true";

// Object Storage S3-compatible (MinIO en dev, Infomaniak Swift en prod) —
// voir @arborisis/storage et plan/05 §5.10.
const OBJECT_STORAGE_ENDPOINT = process.env.OBJECT_STORAGE_ENDPOINT;
// "us-east-1" par défaut, pas la région OpenStack réelle — voir
// @arborisis/storage StorageConfig (passerelle S3-compat Infomaniak testée en
// conditions réelles : rejette toute autre région pour la signature SigV4).
const OBJECT_STORAGE_REGION = process.env.OBJECT_STORAGE_REGION ?? "us-east-1";
const OBJECT_STORAGE_BUCKET = process.env.OBJECT_STORAGE_BUCKET;
const OBJECT_STORAGE_ACCESS_KEY_ID = process.env.OBJECT_STORAGE_ACCESS_KEY_ID;
const OBJECT_STORAGE_SECRET_ACCESS_KEY = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY;
const OBJECT_STORAGE_FORCE_PATH_STYLE = process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false";

if (!OBJECT_STORAGE_ENDPOINT || !OBJECT_STORAGE_BUCKET || !OBJECT_STORAGE_ACCESS_KEY_ID || !OBJECT_STORAGE_SECRET_ACCESS_KEY) {
  throw new Error("Configuration Object Storage manquante — voir .env.example (OBJECT_STORAGE_*)");
}

// Binaires ffmpeg/ffprobe — installés sur la VM (Docker image) et en local via
// Homebrew (`brew install ffmpeg`), voir plan/05 §5.3. Pas de dépendance npm
// static-binary (ffmpeg-static/ffprobe-static) : ce sont ~80 Mo de binaires
// téléchargés au postinstall, superflus alors qu'un ffmpeg système suffit
// partout où le worker tourne réellement.
const FFMPEG_PATH = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH ?? "ffprobe";

// Meilisearch (Phase 4) — indexation à la publication, voir @arborisis/search
// et plan/08-donnees-et-recherche.md §8.3.
const MEILI_URL = process.env.MEILI_URL ?? "http://localhost:7700";
const MEILI_MASTER_KEY = process.env.MEILI_MASTER_KEY;
if (!MEILI_MASTER_KEY) {
  throw new Error("MEILI_MASTER_KEY manquant — voir infra/docker-compose.yml / .env");
}

export const config = {
  REDIS_URL,
  DATABASE_URL,
  ARCHIVE_TO_IA,
  FFMPEG_PATH,
  FFPROBE_PATH,
  search: { host: MEILI_URL, apiKey: MEILI_MASTER_KEY },
  storage: {
    endpoint: OBJECT_STORAGE_ENDPOINT,
    region: OBJECT_STORAGE_REGION,
    bucket: OBJECT_STORAGE_BUCKET,
    accessKeyId: OBJECT_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: OBJECT_STORAGE_SECRET_ACCESS_KEY,
    forcePathStyle: OBJECT_STORAGE_FORCE_PATH_STYLE,
  },
};

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL manquant — voir infra/docker-compose.yml / .env");
}

// Mode intérimaire — voir plan/05-stockage-audio-internet-archive.md §5.10.
// Reste `false` tant que le seuil de 50 items publiés côté Internet Archive
// n'est pas atteignable ; ne change AUCUN comportement au-delà de cette étape.
const ARCHIVE_TO_IA = process.env.ARCHIVE_TO_IA === "true";

export const config = { REDIS_URL, DATABASE_URL, ARCHIVE_TO_IA };

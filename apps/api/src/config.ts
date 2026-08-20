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
  // Bug réel trouvé en prod (2026-08-20, voir plan/MEMORY.md) : la passerelle
  // S3-compat Infomaniak ne répond pas correctement aux préflights CORS
  // (OPTIONS → 405) sur les requêtes PUT pré-signées envoyées directement par
  // le navigateur — même limitation déjà rencontrée pour le bucket de tuiles
  // (§5 Phase 5, `PutBucketCors` en 501). Optionnel : quand définie, l'URL
  // d'upload pré-signée renvoyée par `POST /uploads/presign` a son origine
  // réécrite vers cette valeur (ex. `https://arborisis.com/storage-upload`,
  // proxifiée same-origin par Caddy vers `s3.pub1.infomaniak.cloud`, voir
  // infra/caddy/Caddyfile) — élimine le CORS au lieu d'essayer de le
  // configurer côté Infomaniak. Non définie en dev (MinIO répond correctement
  // aux préflights, testé en conditions réelles Phase 2/3).
  OBJECT_STORAGE_UPLOAD_PROXY_URL: z.string().url().optional(),
  // Meilisearch (Phase 4) — voir @arborisis/search et plan/08 §8.3.
  MEILI_URL: z.string().url().default("http://localhost:7700"),
  MEILI_MASTER_KEY: z.string().min(1),
  // Géocodage (Phase 4 bootstrap → Phase 5 auto-hébergé, voir plan/07 §7.5).
  // Server-side (pas NEXT_PUBLIC_*) : depuis Phase 5, le navigateur n'appelle
  // plus Photon directement — l'instance auto-hébergée de production vit sur
  // un réseau privé sans IP publique (voir infra/photon/README.md), donc
  // seule l'API peut l'atteindre. GET /geocode proxifie la requête. Défaut =
  // même instance publique de démonstration qu'avant, pour ne rien changer
  // en dev tant que PHOTON_URL n'est pas explicitement pointé vers l'instance
  // privée.
  PHOTON_URL: z.string().url().default("https://photon.komoot.io/api"),
  // Revue des signalements (Phase 5, plan/10 §10.3) : pas de rôle admin en
  // base, volontairement — liste de handles séparés par des virgules
  // autorisés à lister/résoudre les signalements. Simplification assumée en
  // l'absence d'écran d'administration dédié, voir apps/api/src/lib/admin.ts.
  ADMIN_HANDLES: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean)
    ),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}

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
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}

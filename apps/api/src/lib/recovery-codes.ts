import { randomInt, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Codes de récupération à usage unique — voir
 * plan/06-authentification-sans-mot-de-passe.md §6.2 et §6.4 ("code_hash: string
 * -- haché, jamais stocké en clair").
 *
 * Implémentation Phase 1 : `scrypt` (natif Node, aucune dépendance binaire
 * externe à compiler). Le plan mentionne argon2 comme cible ; scrypt offre des
 * garanties comparables pour un secret aléatoire à haute entropie (contrairement
 * à un mot de passe choisi par l'utilisateur) — à revisiter si besoin lors de la
 * revue de sécurité de la Phase 5 (voir plan/TASKS.md, Phase 5).
 */

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/** 10 codes lisibles, ex. "7F3K-9QRT-2ZXP" — voir 06.2. */
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I, ambiguïté visuelle
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const parts = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("")
    );
    codes.push(parts.join("-"));
  }
  return codes;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const salt = randomInt(2 ** 31).toString(16);
  const derived = (await scrypt(code, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  const [salt, hex] = hash.split(":");
  if (!salt || !hex) return false;
  const derived = (await scrypt(code, salt, KEY_LENGTH)) as Buffer;
  const stored = Buffer.from(hex, "hex");
  return derived.length === stored.length && timingSafeEqual(derived, stored);
}

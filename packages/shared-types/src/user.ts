import { z } from "zod";

/**
 * Identifiant public d'un utilisateur — voir plan/06-authentification-sans-mot-de-passe.md §6.2.
 * Pas d'email, pas de mot de passe : seulement un pseudo unique.
 */
export const handleSchema = z
  .string()
  .min(3, "3 caractères minimum")
  .max(24, "24 caractères maximum")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "minuscules, chiffres et tirets uniquement, ne commence/finit pas par un tiret"
  );

export const userSchema = z.object({
  id: z.string().uuid(),
  handle: handleSchema,
  displayName: z.string().max(80).nullable(),
  bio: z.string().max(500).nullable(),
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof userSchema>;

/** Corps de la requête d'inscription — étape "choisir un pseudo" avant la cérémonie WebAuthn. */
export const registerStartInputSchema = z.object({
  handle: handleSchema,
});
export type RegisterStartInput = z.infer<typeof registerStartInputSchema>;

/** Corps de la requête de connexion — étape "saisir/retrouver le pseudo" avant la cérémonie WebAuthn. */
export const loginStartInputSchema = z.object({
  handle: handleSchema,
});
export type LoginStartInput = z.infer<typeof loginStartInputSchema>;

export const authenticatorTransportSchema = z.enum([
  "usb",
  "nfc",
  "ble",
  "internal",
  "hybrid",
]);

export const webauthnCredentialSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceLabel: z.string().max(80),
  transports: z.array(authenticatorTransportSchema),
  createdAt: z.coerce.date(),
});
export type WebauthnCredential = z.infer<typeof webauthnCredentialSchema>;

"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { api } from "@/lib/api";

// Type dérivé du paramètre attendu par startRegistration plutôt qu'importé
// sous un nom précis (évite une dépendance à un export de type qui peut
// bouger d'une version à l'autre de @simplewebauthn/browser).
type RegistrationOptionsJSON = Parameters<typeof startRegistration>[0]["optionsJSON"];

/**
 * Flux d'inscription — voir plan/06-authentification-sans-mot-de-passe.md §6.2.
 * Pseudo unique, puis cérémonie WebAuthn ; les 10 codes de récupération sont
 * affichés une seule fois immédiatement après.
 */
export default function RegisterPage() {
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("pending");
    setError(null);
    try {
      const options = await api.post<RegistrationOptionsJSON>("/auth/register/start", { handle });
      const response = await startRegistration({ optionsJSON: options });
      const result = await api.post<{ recoveryCodes: string[] }>("/auth/register/finish", {
        handle,
        response,
      });
      setRecoveryCodes(result.recoveryCodes);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("error");
    }
  }

  if (recoveryCodes) {
    return (
      <main style={{ padding: "var(--space-8)", maxWidth: 480 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
          Compte créé — sauvegardez vos codes
        </h1>
        <p style={{ color: "var(--color-ink-secondary)" }}>
          Ces 10 codes ne seront plus jamais affichés. Sans eux ni un second authentificateur,
          la perte de cet appareil peut signifier une perte d&apos;accès définitive au compte
          (voir plan/06 §6.6).
        </p>
        <ul style={{ fontFamily: "monospace" }}>
          {recoveryCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main style={{ padding: "var(--space-8)", maxWidth: 480 }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>S&apos;inscrire</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="handle">Pseudo</label>
        <input
          id="handle"
          name="handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoComplete="username webauthn"
          minLength={3}
          maxLength={24}
          required
        />
        <button type="submit" disabled={status === "pending"}>
          {status === "pending" ? "…" : "Créer un passkey"}
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startRegistration } from "@simplewebauthn/browser";
import { AuthPage } from "@/components/AuthPage";
import { TextField } from "@/components/FormField";
import { Button } from "@/components/Button";
import { useSession } from "@/lib/session";
import { api } from "@/lib/api";
import styles from "@/components/AuthPage.module.css";

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
  const router = useRouter();
  const { refresh } = useSession();
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
      await refresh();
      setRecoveryCodes(result.recoveryCodes);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("error");
    }
  }

  if (recoveryCodes) {
    return (
      <AuthPage title="Compte créé — sauvegardez vos codes">
        <p className={styles.subtitle}>
          Ces 10 codes ne seront plus jamais affichés. Sans eux ni un second authentificateur, la
          perte de cet appareil peut signifier une perte d&apos;accès définitive au compte (voir
          plan/06 §6.6).
        </p>
        {/* Espacement des caractères plutôt qu'une police monospace dédiée :
            aucun token --font-mono n'existe dans le design system fermé
            (packages/design-tokens/src/tokens.css ne définit que sans/serif),
            voir DEV-HANDOFF §1.4. */}
        <ul className={styles.recoveryList}>
          {recoveryCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <div className={styles.submitRow}>
          <Button variant="primary" onClick={() => router.push("/")}>
            J&apos;ai sauvegardé mes codes
          </Button>
        </div>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title="S'inscrire"
      subtitle="Un pseudo, puis un passkey créé par votre navigateur ou gestionnaire de mots de passe — aucun mot de passe à retenir."
      footer={
        <>
          Déjà un compte ? <Link href="/login">Se connecter</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label="Pseudo"
          id="handle"
          name="handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoComplete="username webauthn"
          minLength={3}
          maxLength={24}
          autoFocus
          required
        />
        <div className={styles.submitRow}>
          <Button type="submit" variant="primary" disabled={status === "pending"}>
            {status === "pending" ? "…" : "Créer un passkey"}
          </Button>
        </div>
        {error && <p className={styles.formError}>{error}</p>}
      </form>
    </AuthPage>
  );
}

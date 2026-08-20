"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { AuthPage } from "@/components/AuthPage";
import { TextField } from "@/components/FormField";
import { Button } from "@/components/Button";
import { useSession } from "@/lib/session";
import { api } from "@/lib/api";
import styles from "@/components/AuthPage.module.css";

type AuthenticationOptionsJSON = Parameters<typeof startAuthentication>[0]["optionsJSON"];

/** Flux de connexion — voir plan/06-authentification-sans-mot-de-passe.md §6.3. */
export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("pending");
    setError(null);
    try {
      const options = await api.post<AuthenticationOptionsJSON>("/auth/login/start", { handle });
      const response = await startAuthentication({ optionsJSON: options });
      await api.post("/auth/login/finish", { handle, response });
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("error");
    }
  }

  return (
    <AuthPage
      title="Se connecter"
      subtitle="Utilisez le passkey associé à votre pseudo — empreinte, visage ou code de l'appareil, selon ce que propose votre navigateur."
      footer={
        <>
          Pas encore de compte ? <Link href="/register">S&apos;inscrire</Link>
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
          autoFocus
          required
        />
        <div className={styles.submitRow}>
          <Button type="submit" variant="primary" disabled={status === "pending"}>
            {status === "pending" ? "…" : "Continuer"}
          </Button>
        </div>
        {error && <p className={styles.formError}>{error}</p>}
      </form>
    </AuthPage>
  );
}

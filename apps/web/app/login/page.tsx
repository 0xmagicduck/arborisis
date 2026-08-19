"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "@/lib/api";

type AuthenticationOptionsJSON = Parameters<typeof startAuthentication>[0]["optionsJSON"];

/** Flux de connexion — voir plan/06-authentification-sans-mot-de-passe.md §6.3. */
export default function LoginPage() {
  const router = useRouter();
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
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("error");
    }
  }

  return (
    <main style={{ padding: "var(--space-8)", maxWidth: 480 }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>Se connecter</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="handle">Pseudo</label>
        <input
          id="handle"
          name="handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoComplete="username webauthn"
          required
        />
        <button type="submit" disabled={status === "pending"}>
          {status === "pending" ? "…" : "Continuer"}
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}

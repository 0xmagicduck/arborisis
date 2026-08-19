import Link from "next/link";

/**
 * Placeholder Phase 1 : les écrans réels (Explorer, Découvrir, ...) arrivent
 * en Phase 3, voir plan/TASKS.md. Cette page ne sert qu'à valider le socle
 * (build Next.js + accès aux routes d'auth).
 */
export default function HomePage() {
  return (
    <main style={{ padding: "var(--space-8)", maxWidth: 480 }}>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--color-stone)" }}>
        ARBORISIS
      </p>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: 32,
          color: "var(--color-ink-strong)",
        }}
      >
        Socle technique — Phase 1
      </h1>
      <p style={{ color: "var(--color-ink-secondary)" }}>
        Les écrans du produit (Explorer, Découvrir…) arrivent en Phase 3. En attendant,
        l&apos;authentification WebAuthn de bout en bout est vérifiable ici :
      </p>
      <p>
        <Link href="/register">S&apos;inscrire</Link> · <Link href="/login">Se connecter</Link>
      </p>
    </main>
  );
}

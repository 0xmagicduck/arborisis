import type { ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import styles from "./LegalPage.module.css";

/**
 * Coquille commune aux 3 pages légales (CGU, confidentialité, mentions
 * légales) — Phase 5, voir plan/10-securite-confidentialite-conformite.md.
 * Aucun mockup design/system pour ces écrans, comme Login/Register en
 * Phase 3 (voir plan/TASKS.md).
 */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <AppShell activeNav={null} mobileHeader={{ kind: "back", fallbackHref: "/" }} showTabBar={false}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Explorer
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Dernière mise à jour : {updated}</p>
        <div className={styles.content}>{children}</div>
      </div>
    </AppShell>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import styles from "./AuthPage.module.css";

/**
 * Coquille commune à Login/Register — aucun mockup design/system pour ces
 * deux écrans (voir plan/TASKS.md Phase 3, même situation que LegalPage en
 * Phase 5), donc pas de rendu de référence `.dc.html` à porter fidèlement.
 * Réutilise le même patron qu'AppShell + LegalPage : colonne étroite
 * centrée, titre serif italique, retour vers Explorer.
 */
export function AuthPage({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell activeNav={null} mobileHeader={{ kind: "back", fallbackHref: "/" }} showTabBar={false}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Explorer
        </Link>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </AppShell>
  );
}

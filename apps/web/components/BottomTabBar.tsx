import type { ReactNode } from "react";
import Link from "next/link";
import type { NavKey } from "./Header";
import styles from "./BottomTabBar.module.css";

/**
 * Voir design/handoff/DEV-HANDOFF.md §2.8 — toujours les 4 mêmes items,
 * jamais un 5ᵉ pour le Profil (rejoint via l'avatar, voir §2.1/§2.8). Note :
 * MobileProfile.dc.html dessine un badge avatar en 4ᵉ position à la place de
 * Recherche ; on suit ici la règle explicite du composant plutôt que ce
 * pixel-là (voir plan/TASKS.md, journal de session) — la page Profil, comme
 * RecordingDetail et Ajouter, n'affiche donc pas cette barre (elle a déjà un
 * header "back").
 *
 * Chaque icône utilise `stroke="currentColor"` : la couleur active/inactive
 * est portée par le `color` du lien parent, pas dupliquée par état.
 */
const TABS: { key: Exclude<NavKey, null>; label: string; href: string; icon: ReactNode }[] = [
  {
    key: "explorer",
    label: "Explorer",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M10,8 C10,8 15,12 15,15.5 C15,17.5 12.8,19 10,19 C7.2,19 5,17.5 5,15.5 C5,12 10,8 10,8 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    ),
  },
  {
    key: "decouvrir",
    label: "Découvrir",
    href: "/decouvrir",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2,10 C5,6 8,14 11,10 C14,6 17,14 18,11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "ajouter",
    label: "Ajouter",
    href: "/ajouter",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10,3 L10,17 M3,10 L17,10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "recherche",
    label: "Recherche",
    href: "/recherche",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BottomTabBar({ activeNav }: { activeNav: NavKey }) {
  return (
    <nav className={styles.bar} aria-label="Navigation principale">
      {TABS.map((tab) => (
        <Link key={tab.key} href={tab.href} className={styles.item} data-active={activeNav === tab.key}>
          <span
            style={{ display: "inline-flex", color: activeNav === tab.key ? "var(--color-ink)" : "var(--color-stone)" }}
          >
            {tab.icon}
          </span>
          <span className={styles.label}>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

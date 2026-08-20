import Link from "next/link";
import { useSession } from "@/lib/session";
import { Avatar } from "./Avatar";
import styles from "./Header.module.css";

export type NavKey = "explorer" | "decouvrir" | "ajouter" | "recherche" | null;

const NAV_ITEMS: { key: Exclude<NavKey, null>; label: string; href: string }[] = [
  { key: "explorer", label: "Explorer", href: "/" },
  { key: "decouvrir", label: "Découvrir", href: "/decouvrir" },
  { key: "ajouter", label: "Ajouter", href: "/ajouter" },
  { key: "recherche", label: "Recherche", href: "/recherche" },
];

/**
 * Header desktop — voir design/handoff/DEV-HANDOFF.md §2.1. `activeNav: null`
 * sur les pages secondaires (RecordingDetail, Profil), aucun item surligné.
 * Caché sous 768px (voir Header.module.css) au profit de MobileTopBar.
 */
export function Header({ activeNav, tagline = false }: { activeNav: NavKey; tagline?: boolean }) {
  const { user, status } = useSession();

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.wordmark}>
        ARBORISIS
      </Link>

      <nav className={styles.nav} aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => (
          <Link key={item.key} href={item.href} className={styles.navItem} data-active={activeNav === item.key}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.trailing}>
        {tagline && <span className={styles.tagline}>Listen to the places around us.</span>}
        <Link href={status === "authenticated" ? "/profil" : "/login"} className={styles.avatarLink} aria-label="Profil">
          <Avatar label={user?.handle ?? "?"} sizePx={26} fontSizePx={10} />
        </Link>
      </div>
    </header>
  );
}

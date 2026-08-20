import type { ReactNode } from "react";
import { Header, type NavKey } from "./Header";
import { MobileTopBar, type MobileHeaderSpec } from "./MobileTopBar";
import { BottomTabBar } from "./BottomTabBar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  activeNav: NavKey;
  tagline?: boolean;
  mobileHeader: MobileHeaderSpec;
  /** RecordingDetail/Ajouter (et Profil, voir BottomTabBar) n'affichent pas la barre. */
  showTabBar?: boolean;
  children: ReactNode;
}

/**
 * Coquille commune à tous les écrans — bascule desktop/mobile entièrement en
 * CSS (les deux gabarits sont rendus, un seul visible par media query) plutôt
 * qu'en JS, pour rester fidèle à l'exigence "fluide" du handoff (§3.7) sans
 * décalage d'hydratation SSR/CSR. Voir design/handoff/DEV-HANDOFF.md §4.
 */
export function AppShell({ activeNav, tagline = false, mobileHeader, showTabBar = true, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <Header activeNav={activeNav} tagline={tagline} />
      <MobileTopBar spec={mobileHeader} />
      <main className={styles.main}>{children}</main>
      {showTabBar && <BottomTabBar activeNav={activeNav} />}
    </div>
  );
}

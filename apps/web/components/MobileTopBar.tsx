import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { Avatar } from "./Avatar";
import styles from "./MobileTopBar.module.css";

export type MobileHeaderSpec =
  | { kind: "floating" } // Explorer — voir MobileExplorer.dc.html
  | { kind: "section"; label: string } // Découvrir, Recherche — voir MobileDiscover.dc.html
  | { kind: "back"; fallbackHref: string }; // RecordingDetail, Ajouter, Profil

/** Voir design/handoff/DEV-HANDOFF.md §3.7 — trois gabarits de top bar mobile. */
export function MobileTopBar({ spec }: { spec: MobileHeaderSpec }) {
  const { user, status } = useSession();
  const router = useRouter();

  if (spec.kind === "section") {
    return (
      <div className={`${styles.bar} ${styles.section}`}>
        <Link href="/" className={styles.wordmark}>
          ARBORISIS
        </Link>
        <span className={styles.sectionLabel}>{spec.label}</span>
      </div>
    );
  }

  if (spec.kind === "back") {
    // `router.back()` quand une entrée d'historique existe réellement (venu
    // d'un écran de l'app) ; sinon repli sur `fallbackHref` (arrivée directe
    // par URL, ex. lien partagé vers une fiche) — voir DEV-HANDOFF §3.7.
    const goBack = () => {
      if (typeof window !== "undefined" && window.history.length > 1) router.back();
      else router.push(spec.fallbackHref);
    };
    return (
      <div className={`${styles.bar} ${styles.back}`}>
        <button type="button" onClick={goBack} className={styles.backLink} aria-label="Retour">
          ←
        </button>
        <span className={styles.wordmark}>ARBORISIS</span>
        <span className={styles.spacer} aria-hidden="true" />
      </div>
    );
  }

  // floating — Explorer uniquement, superposé à la carte.
  return (
    <div className={`${styles.bar} ${styles.floating}`}>
      <span className={styles.wordmark}>ARBORISIS</span>
      <Link href={status === "authenticated" ? "/profil" : "/login"} className={styles.avatarLink} aria-label="Profil">
        <Avatar label={user?.handle ?? "?"} sizePx={30} fontSizePx={11} />
      </Link>
    </div>
  );
}

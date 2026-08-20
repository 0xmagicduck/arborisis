"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Recording } from "@arborisis/shared-types";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { RecordingCard } from "@/components/RecordingCard";
import { Button } from "@/components/Button";
import { EmptyState, ErrorState } from "@/components/StateMessage";
import { Skeleton } from "@/components/Skeleton";
import { useSession } from "@/lib/session";
import { myRecordings } from "@/lib/api";
import styles from "./page.module.css";

/**
 * Profil (le sien) — voir design/handoff/DEV-HANDOFF.md §3.5 et
 * design/system/Profile.dc.html + MobileProfile.dc.html. Pas de profil
 * d'un·e autre utilisateur·ice dans ce MVP (non requis par le brief produit,
 * voir design/README.md — 6 écrans, aucune destination "profil public
 * d'autrui" listée).
 */
export default function ProfilePage() {
  const { user, status: sessionStatus, logout } = useSession();
  const router = useRouter();
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.replace("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    let cancelled = false;
    setRecordings(null);
    setError(null);
    myRecordings()
      .then((r) => {
        if (!cancelled) setRecordings(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur inconnue");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, attempt]);

  if (sessionStatus === "loading" || sessionStatus === "unauthenticated") {
    return (
      <AppShell activeNav={null} mobileHeader={{ kind: "back", fallbackHref: "/" }} showTabBar={false}>
        <div className={styles.container}>
          <Skeleton height={72} width={72} style={{ borderRadius: "50%" }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeNav={null} mobileHeader={{ kind: "back", fallbackHref: "/" }} showTabBar={false}>
      <div className={styles.container}>
        <div className={styles.identity}>
          <Avatar label={user!.handle} sizePx={72} fontSizePx={26} serif />
          <div>
            <div className={styles.name}>{user!.displayName ?? user!.handle}</div>
            {user!.bio && <div className={styles.bio}>{user!.bio}</div>}
            <div className={styles.countLine}>
              {recordings ? `${recordings.length} recording${recordings.length === 1 ? "" : "s"}` : "…"}
            </div>
          </div>
        </div>

        <div className={styles.eyebrow}>Field recordings</div>

        {recordings === null && !error && (
          <div className={styles.grid}>
            <Skeleton height={140} />
            <Skeleton height={140} />
            <Skeleton height={140} />
          </div>
        )}

        {error && <ErrorState message={`Impossible de charger vos enregistrements : ${error}`} onRetry={() => setAttempt((a) => a + 1)} />}

        {recordings && recordings.length === 0 && (
          <EmptyState message="Vous n'avez pas encore publié d'enregistrement." />
        )}

        {recordings && recordings.length > 0 && (
          <div className={styles.grid}>
            {recordings.map((recording) => (
              <RecordingCard key={recording.id} recording={recording} showStatus />
            ))}
          </div>
        )}

        <div className={styles.logoutRow}>
          <Button variant="secondary" onClick={() => logout().then(() => router.push("/"))}>
            Se déconnecter
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

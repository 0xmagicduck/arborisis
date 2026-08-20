"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StepIndicator } from "@/components/StepIndicator";
import { Skeleton } from "@/components/Skeleton";
import { useSession } from "@/lib/session";
import { StepSound, type SoundResult } from "./StepSound";
import { StepDetails, type DetailsValues } from "./StepDetails";
import { StepPublish } from "./StepPublish";
import styles from "./page.module.css";

const EMPTY_DETAILS: DetailsValues = {
  title: "",
  locationLabel: "",
  locationLat: null,
  locationLng: null,
  description: "",
  tagsInput: "",
};

/**
 * Ajouter — flux en 3 étapes, voir design/handoff/DEV-HANDOFF.md §3.4.
 * Auth-gardé comme /profil : publier un enregistrement suppose une session.
 */
export default function AjouterPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [sound, setSound] = useState<SoundResult | null>(null);
  const [details, setDetails] = useState<DetailsValues>(EMPTY_DETAILS);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.replace("/login");
  }, [sessionStatus, router]);

  return (
    <AppShell activeNav="ajouter" mobileHeader={{ kind: "back", fallbackHref: "/" }} showTabBar={false}>
      <div className={styles.container}>
        {(sessionStatus === "loading" || sessionStatus === "unauthenticated") && (
          <div className={styles.column}>
            <Skeleton height={200} />
          </div>
        )}

        {sessionStatus === "authenticated" && (
          <div className={styles.column}>
            <StepIndicator currentStep={step} onStepClick={(target) => target < step && setStep(target)} />

            {step === 0 && (
              <StepSound
                onComplete={(result) => {
                  setSound(result);
                  setStep(1);
                }}
              />
            )}

            {step === 1 && sound && (
              <StepDetails
                file={sound.file}
                durationSeconds={sound.durationSeconds}
                values={details}
                onBack={() => setStep(0)}
                onContinue={(values) => {
                  setDetails(values);
                  setStep(2);
                }}
              />
            )}

            {step === 2 && sound && (
              <StepPublish
                uploadId={sound.uploadId}
                durationSeconds={sound.durationSeconds}
                details={details}
                onBack={() => setStep(1)}
                onPublished={(id) => router.push(`/enregistrements/${id}`)}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

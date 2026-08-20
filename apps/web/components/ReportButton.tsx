"use client";

import { useState } from "react";
import type { ReportReason } from "@arborisis/shared-types";
import { Button } from "@/components/Button";
import { TextareaField } from "@/components/FormField";
import { reportRecording } from "@/lib/api";
import styles from "./ReportButton.module.css";

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "illegal_content", label: "Illegal content" },
  { value: "off_topic", label: "Off-topic (not a field recording)" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

type PanelState = "closed" | "open" | "submitting" | "sent" | "unauthenticated" | "error";

/**
 * Signalement minimal (plan/10-securite-confidentialite-conformite.md §10.3).
 * Aucun mockup design/system pour cet écran (même situation que Login/Register
 * en Phase 3, voir plan/TASKS.md) : composé à partir des primitives Button/
 * FormField existantes plutôt que d'un rendu de référence dédié.
 */
export function ReportButton({ recordingId }: { recordingId: string }) {
  const [state, setState] = useState<PanelState>("closed");
  const [reason, setReason] = useState<ReportReason>("illegal_content");
  const [details, setDetails] = useState("");

  if (state === "closed") {
    return (
      <button type="button" className={styles.trigger} onClick={() => setState("open")}>
        Report this recording
      </button>
    );
  }

  if (state === "sent") {
    return <p className={styles.feedback}>Thank you — this recording has been reported for review.</p>;
  }

  async function submit() {
    setState("submitting");
    try {
      await reportRecording(recordingId, { reason, details: details.trim() || undefined });
      setState("sent");
    } catch (err) {
      // 401 attendu si personne n'est connecté — message dédié plutôt que
      // l'erreur générique (voir requireUserId côté API).
      if (err instanceof Error && err.message === "unauthenticated") {
        setState("unauthenticated");
      } else {
        setState("error");
      }
    }
  }

  return (
    <div className={styles.panel}>
      {state === "unauthenticated" && (
        <p className={styles.feedback}>
          You need to be signed in to report content — <a href="/login">sign in</a>.
        </p>
      )}
      {state === "error" && <p className={styles.feedback}>Something went wrong — please try again.</p>}

      <div className={styles.reasonGroup} role="radiogroup" aria-label="Reason">
        {REASON_OPTIONS.map((option) => {
          const checked = reason === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              className={styles.reasonOption}
              onClick={() => setReason(option.value)}
            >
              <span className={styles.radioOuter} data-checked={checked}>
                {checked && <span className={styles.radioInner} />}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>

      <TextareaField
        label="Details (optional)"
        id="report-details"
        rows={2}
        maxLength={1000}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />

      <div className={styles.actions}>
        <Button variant="primary" disabled={state === "submitting"} onClick={submit}>
          {state === "submitting" ? "Sending…" : "Submit report"}
        </Button>
        <Button variant="secondary" disabled={state === "submitting"} onClick={() => setState("closed")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

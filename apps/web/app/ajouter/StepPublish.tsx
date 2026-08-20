"use client";

import { useState } from "react";
import type { License } from "@arborisis/shared-types";
import { Button } from "@/components/Button";
import { Waveform } from "@/components/Waveform";
import { formatDuration } from "@/lib/format";
import { createRecording } from "@/lib/api";
import type { DetailsValues } from "./StepDetails";
import styles from "./page.module.css";

const LICENSE_OPTIONS: { value: License; label: string }[] = [
  { value: "CC0", label: "CC0 1.0 — public domain, no attribution required" },
  { value: "CC-BY", label: "CC BY 4.0 — attribution required" },
  { value: "CC-BY-SA", label: "CC BY-SA 4.0 — attribution, share-alike" },
  { value: "CC-BY-NC", label: "CC BY-NC 4.0 — non-commercial" },
];

interface StepPublishProps {
  uploadId: string;
  durationSeconds: number | null;
  details: DetailsValues;
  onBack: () => void;
  onPublished: (recordingId: string) => void;
}

/** Étape 3 — voir design/handoff/DEV-HANDOFF.md §3.4 et design/system/Upload3.dc.html. */
export function StepPublish({ uploadId, durationSeconds, details, onBack, onPublished }: StepPublishProps) {
  const [license, setLicense] = useState<License | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = details.tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

  async function handlePublish() {
    if (!license || details.locationLat == null || details.locationLng == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const recording = await createRecording({
        uploadId,
        title: details.title.trim(),
        description: details.description.trim() || undefined,
        locationLabel: details.locationLabel.trim(),
        locationLat: details.locationLat,
        locationLng: details.locationLng,
        recordedAt: new Date(),
        tags,
        license,
      });
      onPublished(recording.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La publication a échoué.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.column}>
      <div className={styles.heading}>Review before publishing</div>

      <div className={styles.reviewCard}>
        <div className={styles.reviewTitle}>{details.title}</div>
        <div className={styles.reviewLocation}>{details.locationLabel}</div>
        <Waveform data={null} heightPx={26} maxBars={40} />
        <div className={styles.reviewMeta}>
          {durationSeconds ? formatDuration(durationSeconds) : "—"}
          {tags.length > 0 ? ` — ${tags.join(" · ")}` : ""}
        </div>
      </div>

      <div>
        <div className={styles.dropzoneHint} style={{ marginBottom: 12 }}>
          License
        </div>
        <div className={styles.licenseGroup} role="radiogroup" aria-label="License">
          {LICENSE_OPTIONS.map((option) => {
            const checked = license === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                className={styles.licenseOption}
                onClick={() => setLicense(option.value)}
              >
                <span className={styles.radioOuter} data-checked={checked}>
                  {checked && <span className={styles.radioInner} />}
                </span>
                <span className={styles.licenseLabel}>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className={styles.submitError}>{error}</div>}

      <div className={styles.footer}>
        <button type="button" className={styles.backLink} onClick={onBack} disabled={submitting}>
          ← Back
        </button>
        <Button variant="primary" disabled={!license || submitting} onClick={handlePublish}>
          {submitting ? "Publishing…" : "Publish recording"}
        </Button>
      </div>
    </div>
  );
}

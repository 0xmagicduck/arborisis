"use client";

import { useEffect, useMemo, useState } from "react";
import { TextField, TextareaField } from "@/components/FormField";
import { Button } from "@/components/Button";
import { PlayButton } from "@/components/PlayButton";
import { useAudioPlayer } from "@/lib/audio-player";
import { formatDuration } from "@/lib/format";
import { formatFileSize } from "./local-probe";
import styles from "./page.module.css";

export interface DetailsValues {
  title: string;
  locationLabel: string;
  locationLat: number | null;
  locationLng: number | null;
  description: string;
  tagsInput: string;
}

interface StepDetailsProps {
  file: File;
  durationSeconds: number | null;
  values: DetailsValues;
  onBack: () => void;
  onContinue: (values: DetailsValues) => void;
}

/**
 * Étape 2 — voir design/handoff/DEV-HANDOFF.md §3.4 et
 * design/system/Upload2.dc.html. Pas d'autocomplete géographique ici : le
 * géocodage (Photon) est Phase 4 (plan/TASKS.md) — les coordonnées sont
 * captées via la géolocalisation navigateur le temps que l'utilisateur·ice
 * décrit le lieu en texte libre, voir bouton "Use my current location"
 * ci-dessous (décision documentée dans le journal de session).
 */
export function StepDetails({ file, durationSeconds, values, onBack, onContinue }: StepDetailsProps) {
  const [form, setForm] = useState(values);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "done" | "error">(
    values.locationLat != null ? "done" : "idle"
  );
  const { toggle, isPlaying } = useAudioPlayer();

  // Mémoïsé + révoqué au démontage plutôt que recréé à chaque rendu (fuite
  // d'URL blob sinon — chaque createObjectURL doit être révoqué une fois).
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  const playing = isPlaying("local-preview");

  function requestLocation() {
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((f) => ({ ...f, locationLat: position.coords.latitude, locationLng: position.coords.longitude }));
        setGeoStatus("done");
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  }

  const canContinue = form.title.trim().length > 0 && form.locationLabel.trim().length > 0 && form.locationLat != null;

  return (
    <div className={styles.column}>
      <div className={styles.fileRecap}>
        <PlayButton
          sizePx={30}
          variant="outline"
          tone="accent"
          playing={playing}
          title={file.name}
          onClick={() => toggle({ id: "local-preview", title: file.name, url: previewUrl })}
        />
        <div>
          <div className={styles.fileRecapName}>{file.name}</div>
          <div className={styles.fileRecapMeta}>
            {durationSeconds ? formatDuration(durationSeconds) : "—"} — {formatFileSize(file.size)}
          </div>
        </div>
      </div>

      <div className={styles.fields}>
        <TextField
          id="title"
          label="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <div>
          <TextField
            id="location"
            label="Location"
            placeholder="e.g. Sonian Forest, Belgium"
            value={form.locationLabel}
            onChange={(e) => setForm((f) => ({ ...f, locationLabel: e.target.value }))}
            required
          />
          <div className={styles.locationHelper}>
            {geoStatus !== "done" && (
              <button type="button" className={styles.locationHelperLink} onClick={requestLocation}>
                {geoStatus === "locating" ? "Locating…" : "Use my current location"}
              </button>
            )}
            {geoStatus === "done" && <span className={styles.locationHelperStatus}>Position captured.</span>}
            {geoStatus === "error" && (
              <span className={styles.locationHelperStatus}>Location unavailable — check permissions and retry.</span>
            )}
          </div>
        </div>
        <TextareaField
          id="description"
          label="Description"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <TextField
          id="tags"
          label="Tags — separated by commas"
          value={form.tagsInput}
          onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
        />
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.backLink} onClick={onBack}>
          ← Back
        </button>
        <Button variant="primary" disabled={!canContinue} onClick={() => onContinue(form)}>
          Continue
        </Button>
      </div>
    </div>
  );
}

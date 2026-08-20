"use client";

import { useRef, useState } from "react";
import { uploadContentTypeSchema } from "@arborisis/shared-types";
import { presignUpload, uploadToPresignedUrl } from "@/lib/api";
import { probeFileDurationSeconds } from "./local-probe";
import styles from "./page.module.css";

const ACCEPTED_TYPES = new Set<string>(uploadContentTypeSchema.options);

export interface SoundResult {
  file: File;
  uploadId: string;
  durationSeconds: number | null;
}

/** Étape 1 — voir design/handoff/DEV-HANDOFF.md §3.4 et design/system/Upload1.dc.html + MobileUpload.dc.html. */
export function StepSound({ onComplete }: { onComplete: (result: SoundResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Format non reconnu — WAV, FLAC ou MP3 attendus.");
      return;
    }

    setProgress(0);
    try {
      const [durationSeconds, { uploadId, uploadUrl }] = await Promise.all([
        probeFileDurationSeconds(file),
        presignUpload({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
      ]);
      await uploadToPresignedUrl(uploadUrl, file, setProgress);
      onComplete({ file, uploadId, durationSeconds });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le dépôt du fichier a échoué.");
      setProgress(null);
    }
  }

  return (
    <div className={styles.column}>
      <div className={styles.heading}>Add a field recording</div>
      <div className={styles.subheading}>Start with the sound. You can add the place and details next.</div>

      <button
        type="button"
        className={styles.dropzone}
        data-drag-over={dragOver}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <path
            d="M14,4 L14,20 M7,11 L14,4 L21,11"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M4,24 L24,24" stroke="var(--color-ink)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <div className={styles.dropzoneTitle}>{progress !== null ? "Uploading…" : "Drop your recording here"}</div>
        <div className={styles.dropzoneHint}>WAV, FLAC or MP3</div>
        {progress === null && (
          <span
            style={{
              border: "1px solid var(--color-ink)",
              padding: "9px 22px",
              fontSize: 12,
              fontWeight: 500,
              marginTop: 8,
            }}
          >
            Browse files
          </span>
        )}
        {progress !== null && <div className={styles.progressBar} style={{ width: `${progress * 100}%` }} />}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={uploadContentTypeSchema.options.join(",")}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error && <div className={styles.uploadError}>{error}</div>}

      <div className={styles.privacyNote}>Files stay private until you publish in step 3.</div>
    </div>
  );
}

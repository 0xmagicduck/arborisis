/**
 * Estimation client-side de la durée d'un fichier, pour l'affichage immédiat
 * en étape 2 (voir Upload2.dc.html — "6:42 — 48 kHz / 24-bit"). Purement
 * indicatif : la source de vérité reste le worker (ffprobe), qui écrase
 * `durationSeconds`/`format`/`sampleRate` en base une fois le job traité —
 * voir apps/worker/src/lib/audio.ts. On n'utilise pas l'API Web Audio
 * (`decodeAudioData`) ici pour éviter de décoder entièrement des fichiers
 * potentiellement volumineux (jusqu'à 500 Mo) rien que pour un aperçu.
 */
export function probeFileDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const cleanup = () => URL.revokeObjectURL(url);
    audio.addEventListener("loadedmetadata", () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
      cleanup();
    });
    audio.addEventListener("error", () => {
      resolve(null);
      cleanup();
    });
    audio.src = url;
  });
}

export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

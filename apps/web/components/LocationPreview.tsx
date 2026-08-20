/**
 * Mini-carte non interactive de RecordingDetail — voir
 * design/handoff/DEV-HANDOFF.md §3.3 ("repère visuel, pas un explorateur").
 * Même traitement graphique décoratif que ExplorerMap (voir ce fichier pour
 * le pourquoi), recadré : un seul marqueur, toujours centré, pas de
 * projection lat/lng ici (un seul point n'a rien à projeter par rapport à un
 * autre).
 */
export function LocationPreview({ heightPx = 200 }: { heightPx?: number }) {
  return (
    <svg viewBox="0 0 260 200" preserveAspectRatio="none" style={{ width: "100%", height: heightPx, display: "block" }} aria-hidden="true">
      <rect width="260" height="200" fill="var(--color-paper)" />
      <path
        d="M-10,60 C60,20 130,10 190,45 C230,68 220,110 260,120 L260,200 L-10,200 Z"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="0.9"
        opacity="0.7"
      />
      <path
        d="M-10,95 C65,60 135,50 195,82 C232,102 224,140 260,150"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="0.7"
        opacity="0.3"
      />
      <circle cx="128" cy="86" r="9" fill="none" stroke="var(--color-accent)" strokeWidth="1" />
      <circle cx="128" cy="86" r="3" fill="var(--color-accent)" />
    </svg>
  );
}

/**
 * Formatage partagé par les écrans — voir design/handoff/DEV-HANDOFF.md §2.5
 * (RecordingRow/Card) pour les règles ("m:ss", troncature des tags, etc.).
 */

/** "6:42" — jamais d'heures dans ce MVP (enregistrements de terrain, rarement > 1h). */
export function formatDuration(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/** "16 August 2026" — RecordingDetail (§3.3). */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** "Aug 16" — feed/listes (§2.5). */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).replace(/^(\d+) (\w+)/, "$2 $1");
}

/**
 * "tag1 · tag2 · tag3" — jamais plus de 4 tags affichés inline, au-delà on
 * tronque à 3 + « +N » (§2.5). Vide → chaîne vide, l'appelant décide de ne
 * rien rendre plutôt que d'afficher un placeholder.
 */
export function formatTags(tags: string[], max = 4): string {
  if (tags.length === 0) return "";
  if (tags.length <= max) return tags.join(" · ");
  const shown = tags.slice(0, max - 1);
  const rest = tags.length - shown.length;
  return `${shown.join(" · ")} · +${rest}`;
}

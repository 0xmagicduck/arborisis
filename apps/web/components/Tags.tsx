import { formatTags } from "@/lib/format";

/**
 * Voir design/handoff/DEV-HANDOFF.md §2.11 — texte simple, jamais de pilule.
 * Rend `null` si `tags` est vide (pas de placeholder "no tags", voir §2.5).
 *
 * `tone` suit l'usage réel des mockups plutôt que la seule prose du handoff :
 * `secondary` (ink-secondary) sur RecordingDetail où les tags sont la seule
 * ligne de méta sous la citation, `muted` (stone) dans les listes
 * (Découvrir/Recherche/Profil) où ils accompagnent une durée déjà en stone.
 */
export function Tags({
  tags,
  className,
  tone = "secondary",
}: {
  tags: string[];
  className?: string;
  tone?: "secondary" | "muted";
}) {
  if (tags.length === 0) return null;
  const color = tone === "muted" ? "var(--color-stone)" : "var(--color-ink-secondary)";
  return (
    <span className={className} title={tags.join(" · ")} style={{ color }}>
      {formatTags(tags)}
    </span>
  );
}

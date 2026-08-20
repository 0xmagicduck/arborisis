import styles from "./PlayButton.module.css";

interface PlayButtonProps {
  /** Diamètre en px — le handoff documente 3 paliers (sm 28-32 / md 36-44 / lg 52-64) mais les mockups
   *  utilisent des valeurs précises variables selon l'écran ; un nombre direct reste fidèle à chaque
   *  contexte sans multiplier les enums. */
  sizePx: number;
  variant?: "outline" | "filled";
  /** Anneau/triangle en accent plutôt qu'en encre — outline uniquement (RecordingDetail, panneau Explorer). */
  tone?: "ink" | "accent";
  playing: boolean;
  loading?: boolean;
  disabled?: boolean;
  title: string; // nom de l'enregistrement, pour l'aria-label dynamique
  onClick?: () => void;
}

/** Voir design/handoff/DEV-HANDOFF.md §2.2 — triangle SVG dessiné en path, jamais un font-icon/emoji. */
export function PlayButton({
  sizePx,
  variant = "outline",
  tone = "ink",
  playing,
  loading = false,
  disabled = false,
  title,
  onClick,
}: PlayButtonProps) {
  const triangleH = Math.round(sizePx * 0.32);
  const triangleW = Math.round((triangleH * 10) / 12);
  const iconColor = variant === "filled" ? "var(--color-paper)" : tone === "accent" ? "var(--color-accent)" : "var(--color-ink)";

  return (
    <button
      type="button"
      className={styles.hitArea}
      onClick={onClick}
      disabled={disabled}
      aria-label={playing ? `Pause ${title}` : `Play ${title}`}
      aria-pressed={playing}
    >
      <span
        className={styles.circle}
        data-variant={variant}
        data-tone={tone}
        data-loading={loading}
        style={{ width: sizePx, height: sizePx }}
      >
        <span className={styles.icon} data-hidden={playing}>
          <svg width={triangleW} height={triangleH} viewBox="0 0 10 12" aria-hidden="true">
            <path d="M0,0 L10,6 L0,12 Z" fill={iconColor} />
          </svg>
        </span>
        <span className={styles.icon} data-hidden={!playing}>
          <svg width={triangleW} height={triangleH} viewBox="0 0 10 12" aria-hidden="true">
            <rect x="0" y="0" width="3.2" height="12" fill={iconColor} />
            <rect x="6.8" y="0" width="3.2" height="12" fill={iconColor} />
          </svg>
        </span>
      </span>
    </button>
  );
}

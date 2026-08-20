import type { CSSProperties } from "react";

/**
 * Cercle-contour avec initiale — jamais rempli, quel que soit l'écran (voir
 * design/handoff/DEV-HANDOFF.md §2.1, note sur l'avatar de header).
 */
export function Avatar({
  label,
  sizePx,
  fontSizePx,
  serif = false,
  style,
}: {
  /** Pseudo ou nom affiché — seule la première lettre est rendue. */
  label: string;
  sizePx: number;
  fontSizePx?: number;
  /** Grande taille (Profil) : initiale en serif italique comme le reste des titres. */
  serif?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: "var(--radius-circle)",
        border: "1px solid var(--color-ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: fontSizePx ?? Math.round(sizePx * 0.38),
        fontFamily: serif ? "var(--font-serif)" : "var(--font-sans)",
        fontStyle: serif ? "italic" : "normal",
        background: "var(--color-paper)",
        ...style,
      }}
      aria-hidden="true"
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

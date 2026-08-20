"use client";

import { useMemo, useRef } from "react";
import { Skeleton } from "./Skeleton";
import styles from "./Waveform.module.css";

interface WaveformProps {
  /** Amplitudes normalisées 0-1. Vide → squelette (enregistrement encore en cours de traitement). */
  data: number[] | null;
  heightPx: number;
  barWidthPx?: number;
  /** Position de lecture 0-1 — les barres avant ce point passent en accent (voir §2.3). */
  progress?: number;
  interactive?: boolean;
  onSeek?: (fraction: number) => void;
  /** Nombre de barres rendues quand `data` a plus de valeurs que nécessaire visuellement. */
  maxBars?: number;
}

/**
 * Voir design/handoff/DEV-HANDOFF.md §2.3 — décoratif/informatif à côté du
 * PlayButton, pas le contrôle de lecture principal : `aria-hidden` sauf en
 * mode interactif (alors `role="slider"` sur le conteneur, pas par barre).
 */
export function Waveform({
  data,
  heightPx,
  barWidthPx = 1.5,
  progress = 0,
  interactive = false,
  onSeek,
  maxBars = 60,
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const bars = useMemo(() => {
    if (!data || data.length === 0) return null;
    if (data.length <= maxBars) return data;
    // Rééchantillonnage simple par decimation régulière — suffisant pour un
    // rendu visuel, pas une analyse audio (voir DEV-HANDOFF §2.3).
    const step = data.length / maxBars;
    return Array.from({ length: maxBars }, (_, i) => data[Math.floor(i * step)] ?? 0);
  }, [data, maxBars]);

  if (!bars) {
    return <Skeleton height={heightPx} />;
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeek(fraction);
  }

  const sliderProps = interactive
    ? {
        role: "slider" as const,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.round(progress * 100),
        tabIndex: 0,
      }
    : {};

  return (
    <div
      ref={containerRef}
      className={styles.waveform}
      style={{ height: heightPx }}
      data-interactive={interactive}
      onClick={handleClick}
      aria-hidden={!interactive}
      {...sliderProps}
    >
      {bars.map((amplitude, index) => (
        <span
          key={index}
          className={styles.bar}
          data-played={index / bars.length < progress}
          style={{
            width: barWidthPx,
            height: `${Math.max(8, amplitude * 100)}%`,
          }}
        />
      ))}
    </div>
  );
}

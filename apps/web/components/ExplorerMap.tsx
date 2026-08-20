"use client";

import { useMemo, useState } from "react";
import type { Recording } from "@arborisis/shared-types";
import styles from "./ExplorerMap.module.css";

const VIEW_W = 1440;
const VIEW_H = 740;

/**
 * Fond de carte abstrait — traitement graphique "quiet cartography" (contours
 * fins, pas de tuiles satellite), PAS une géographie réelle. Voir
 * design/handoff/DEV-HANDOFF.md §3.1 : "en production la carte est une vraie
 * carte interactive [...] seul le traitement graphique doit être reproduit".
 * L'intégration MapLibre/pmtiles réelle est Phase 4 (plan/TASKS.md) — ce
 * placeholder projette néanmoins les coordonnées réelles des enregistrements
 * (équirectangulaire) pour que les positions relatives restent honnêtes.
 */
const CONTOUR_PATHS = [
  { d: "M-10,150 C140,60 300,25 440,85 C550,130 540,215 635,255 C745,300 730,200 865,190 C1000,180 1050,265 1015,340 C975,420 1065,460 1180,445 C1275,432 1345,478 1440,458 L1440,740 L-10,740 Z", opacity: 0.85, width: 1 },
  { d: "M-10,225 C145,140 295,110 435,165 C548,205 540,275 632,310 C740,350 728,265 862,255 C995,246 1042,320 1010,388 C972,458 1060,492 1173,478 C1266,467 1332,498 1440,480", opacity: 0.28, width: 0.75 },
  { d: "M-10,300 C150,225 298,198 438,248 C550,285 543,345 636,375 C742,410 730,335 865,326 C996,318 1040,382 1008,442 C972,505 1058,535 1170,522 C1262,512 1328,540 1440,524", opacity: 0.16, width: 0.75 },
  { d: "M-10,375 C155,308 300,285 442,330 C552,363 546,415 640,440 C744,468 732,404 868,396 C998,388 1040,442 1010,494 C976,548 1058,572 1168,562 C1258,553 1324,578 1440,564", opacity: 0.1, width: 0.75 },
];

/** Équirectangulaire simple — suffisant pour un placeholder, pas une projection cartographique de production. */
function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * VIEW_W;
  const y = ((90 - lat) / 180) * VIEW_H;
  return { x, y };
}

interface ExplorerMapProps {
  recordings: Recording[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ExplorerMap({ recordings, selectedId, onSelect }: ExplorerMapProps) {
  const [zoom, setZoom] = useState(1);

  const markers = useMemo(
    () => recordings.map((r) => ({ id: r.id, title: r.title, ...project(r.locationLat, r.locationLng) })),
    [recordings]
  );

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Carte des enregistrements"
      >
        <g className={styles.zoomGroup} style={{ transform: `scale(${zoom})` }}>
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="var(--color-paper)" />
          {CONTOUR_PATHS.map((path, i) => (
            <path key={i} d={path.d} fill="none" stroke="var(--color-ink)" strokeWidth={path.width} opacity={path.opacity} />
          ))}
          {markers.map((marker) => {
            const selected = marker.id === selectedId;
            return (
              <g
                key={marker.id}
                className={styles.marker}
                onClick={() => onSelect(marker.id)}
                role="button"
                tabIndex={0}
                aria-label={marker.title}
                aria-pressed={selected}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(marker.id);
                }}
              >
                {/* Zone cliquable élargie (§2.4 — cible tactile mobile 32×32px minimum). */}
                <circle className={styles.markerHit} cx={marker.x} cy={marker.y} r={16} />
                {selected ? (
                  <>
                    <circle cx={marker.x} cy={marker.y} r={10} fill="none" stroke="var(--color-accent)" strokeWidth={1} />
                    <circle cx={marker.x} cy={marker.y} r={3.2} fill="var(--color-accent)" />
                  </>
                ) : (
                  <circle cx={marker.x} cy={marker.y} r={2.6} fill="var(--color-ink)" />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className={styles.zoomControls}>
        <button
          type="button"
          className={styles.zoomButton}
          aria-label="Zoomer"
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
        >
          +
        </button>
        <button
          type="button"
          className={styles.zoomButton}
          aria-label="Dézoomer"
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
        >
          –
        </button>
      </div>
    </div>
  );
}

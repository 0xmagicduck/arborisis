"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { AttributionControl } from "maplibre-gl";
import { Protocol } from "pmtiles";
import Supercluster from "supercluster";
import type { RecordingMarker } from "@arborisis/shared-types";
import { fetchViewportRecordings } from "@/lib/api";
import { buildQuietCartographyStyle } from "../map-style/quiet-cartography";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./ExplorerMap.module.css";

/**
 * Carte Explorer réelle — MapLibre GL JS + PMTiles + clustering client
 * Supercluster (Phase 4, voir plan/TASKS.md et plan/08-donnees-et-recherche.md
 * §8.2). Remplace le placeholder SVG de la Phase 3.
 *
 * Marqueurs rendus en `maplibregl.Marker` HTML plutôt qu'en couche native
 * `circle`/`symbol` MapLibre : permet (1) de reproduire exactement les
 * variantes `default`/`selected`/`cluster` du handoff (§2.4) avec nos
 * propres tokens de couleur/typo sans dépendre d'un serveur de glyphs
 * externe pour le nombre du cluster, et (2) une gestion clavier/ARIA
 * cohérente avec le reste de l'app (voir styles.marker* ci-dessous).
 */

type MarkerProps = { id: string; title: string };
type MarkerPoint = Supercluster.PointFeature<MarkerProps>;
// `ClusterFeature<C>` — `C` est le type des propriétés de cluster produites
// par `map`/`reduce` (non utilisés ici, voir `Supercluster.AnyProps` par
// défaut) : pas la même chose que `MarkerProps` (les propriétés d'un point).
type MarkerCluster = Supercluster.ClusterFeature<Supercluster.AnyProps>;

const CLUSTER_RADIUS_PX = 50; // voir handoff §2.4 ("distance < 40px" à titre indicatif)
const CLUSTER_MAX_ZOOM = 16;

let protocolRegistered = false;
function ensurePmtilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

function toPointFeature(marker: RecordingMarker): MarkerPoint {
  return {
    type: "Feature",
    properties: { id: marker.id, title: marker.title },
    geometry: { type: "Point", coordinates: [marker.locationLng, marker.locationLat] },
  };
}

interface ExplorerMapProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Recentrage — voir apps/web/app/page.tsx (`?focus=<id>` depuis RecordingDetail). */
  flyTo?: { id: string; lat: number; lng: number } | null;
}

export function ExplorerMap({ selectedId, onSelect, flyTo }: ExplorerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const indexRef = useRef(new Supercluster<MarkerProps>({ radius: CLUSTER_RADIUS_PX, maxZoom: CLUSTER_MAX_ZOOM }));
  const domMarkersRef = useRef(new Map<string, maplibregl.Marker>());
  // Refs plutôt que dépendances d'effet pour `onSelect`/`selectedId` : évite
  // de reconstruire la carte (coûteux) à chaque changement de sélection —
  // seul le handler `updateMarkers` a besoin de la valeur à jour.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const [points, setPoints] = useState<RecordingMarker[]>([]);

  // --- Création de la carte (une seule fois) ---
  useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    const pmtilesUrl = process.env.NEXT_PUBLIC_PMTILES_URL ?? "/tiles/luxembourg.pmtiles";
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildQuietCartographyStyle(pmtilesUrl),
      // Centre par défaut arbitraire (Europe de l'Ouest) — aucune emprise de
      // production tranchée pour l'instant (plan/07 §7.7), sert seulement à
      // afficher directement le fichier de tuiles de démo (Luxembourg) sans
      // interaction. Les marqueurs d'enregistrements, eux, s'affichent
      // n'importe où dans le monde indépendamment de la couverture du fond
      // de carte (le fond reste simplement `--color-paper` hors couverture).
      center: [6.13, 49.61],
      zoom: 8,
      attributionControl: false,
      // §2.4 : "pas de comportement custom à inventer" au-delà du standard —
      // on garde les contrôles MapLibre par défaut pour pan/scroll/pinch,
      // seuls les boutons +/- visuels sont custom (voir styles.zoomControls).
    });
    map.addControl(new AttributionControl({ compact: false }), "bottom-right");
    mapRef.current = map;

    function loadViewport() {
      const b = map.getBounds();
      fetchViewportRecordings({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
      })
        .then(setPoints)
        .catch(() => {
          // Échec silencieux ici : la carte reste utilisable sans marqueurs
          // plutôt que de bloquer tout l'écran sur une erreur réseau
          // ponctuelle — l'utilisateur peut re-déplacer la carte pour
          // redéclencher un essai (voir plan/08 §8.2, pas d'état d'erreur
          // dédié spécifié pour ce cas).
        });
    }

    map.on("load", loadViewport);
    map.on("moveend", loadViewport);

    // Copié dans une variable locale pour le nettoyage : `domMarkersRef` est
    // un `Map` stable pour toute la durée de vie du composant (jamais
    // réassigné), donc `.current` ne peut pas "changer" entre le montage et
    // le démontage au sens où le lint le redoute — copie purement pour
    // satisfaire la règle sans `eslint-disable`.
    const domMarkers = domMarkersRef.current;
    return () => {
      domMarkers.forEach((marker) => marker.remove());
      domMarkers.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Recharge l'index Supercluster quand les points du viewport changent ---
  useEffect(() => {
    indexRef.current.load(points.map(toPointFeature));
    updateMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  // --- Reclustering pendant le zoom/pan (avant qu'un nouveau `moveend` ne
  // recharge les points depuis l'API) — voir plan/08 §8.2 point 3. ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on("render", updateMarkers);
    return () => {
      map.off("render", updateMarkers);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Recentrage depuis RecordingDetail (`?focus=<id>`) ---
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: Math.max(mapRef.current.getZoom(), 12) });
  }, [flyTo]);

  // --- Ré-applique juste la variante visuelle (default/selected) sans tout
  // recalculer quand seule la sélection change (clic venant du panneau/de la
  // bande "Selected", pas du déplacement de la carte). ---
  useEffect(() => {
    updateMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function updateMarkers() {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const zoom = Math.round(map.getZoom());
    const features = indexRef.current.getClusters(bbox, zoom);

    const seenKeys = new Set<string>();

    for (const feature of features) {
      // `Position` (type GeoJSON) est un `number[]` générique, pas un tuple
      // fixe (une position peut porter une altitude en 3ᵉ élément) — sous
      // `noUncheckedIndexedAccess`, la déstructuration donne donc
      // `number | undefined`. Les valeurs par défaut lèvent l'ambiguïté sans
      // changer de comportement réel : Supercluster ne produit ici que des
      // points 2D (voir `toPointFeature` ci-dessus).
      const [lng = 0, lat = 0] = feature.geometry.coordinates;
      const isCluster = "cluster" in feature.properties && feature.properties.cluster === true;
      const key = isCluster
        ? `cluster-${(feature as MarkerCluster).properties.cluster_id}`
        : (feature as MarkerPoint).properties.id;
      seenKeys.add(key);

      let marker = domMarkersRef.current.get(key);
      if (!marker) {
        const el = document.createElement("button");
        el.type = "button";
        marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
        domMarkersRef.current.set(key, marker);
      } else {
        marker.setLngLat([lng, lat]);
      }

      const el = marker.getElement();
      if (isCluster) {
        const clusterFeature = feature as MarkerCluster;
        const count = clusterFeature.properties.point_count;
        // `?? ""` : les classes CSS Modules sont typées `string | undefined`
        // sous `noUncheckedIndexedAccess` (index signature générée par
        // Next.js) — `el.className` (API DOM native) exige un `string` strict,
        // contrairement à `className` en JSX qui accepte `undefined`. La clé
        // existe réellement dans ExplorerMap.module.css, ce filet ne joue
        // donc aucun rôle en pratique.
        el.className = styles.clusterMarker ?? "";
        el.setAttribute("aria-label", `${count} enregistrements`);
        el.textContent = String(clusterFeature.properties.point_count_abbreviated ?? count);
        el.onclick = () => {
          const expansionZoom = Math.min(
            indexRef.current.getClusterExpansionZoom(clusterFeature.properties.cluster_id),
            CLUSTER_MAX_ZOOM + 1
          );
          map.easeTo({ center: [lng, lat], zoom: expansionZoom });
        };
      } else {
        const pointFeature = feature as MarkerPoint;
        const id = pointFeature.properties.id;
        const title = pointFeature.properties.title;
        const selected = id === selectedIdRef.current;
        el.className = (selected ? styles.pointMarkerSelected : styles.pointMarker) ?? "";
        el.setAttribute("aria-label", title);
        el.setAttribute("aria-pressed", String(selected));
        el.textContent = "";
        el.onclick = () => onSelectRef.current(id);
      }
    }

    for (const [key, marker] of domMarkersRef.current) {
      if (!seenKeys.has(key)) {
        marker.remove();
        domMarkersRef.current.delete(key);
      }
    }
  }

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.mapCanvas} role="img" aria-label="Carte des enregistrements" />

      <div className={styles.zoomControls}>
        <button
          type="button"
          className={styles.zoomButton}
          aria-label="Zoomer"
          onClick={() => mapRef.current?.zoomIn()}
        >
          +
        </button>
        <button
          type="button"
          className={styles.zoomButton}
          aria-label="Dézoomer"
          onClick={() => mapRef.current?.zoomOut()}
        >
          –
        </button>
      </div>
    </div>
  );
}

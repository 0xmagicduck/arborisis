import type { StyleSpecification } from "maplibre-gl";

/**
 * Style MapLibre "Quiet Cartography" — écrit à la main (pas un style tiers
 * importé, voir plan/07-carte-open-source.md §7.6) pour reproduire "contours
 * fins, absence de tuiles satellite saturées, marqueurs discrets"
 * (design/handoff/DEV-HANDOFF.md §3.1).
 *
 * Cible le **schéma Protomaps Basemap v4** (couches `water`, `landcover`,
 * `landuse`, `buildings`, `roads`, `boundaries` — voir
 * docs.protomaps.com/basemaps/layers), **pas** le schéma OpenMapTiles ciblé
 * jusqu'ici (voir infra/tiles/README.md pour l'historique du choix initial).
 *
 * Changement de schéma décidé en session (2026-08-20, voir plan/TASKS.md) :
 * la génération OpenMapTiles via Planetiler pour l'emprise Europe s'est
 * révélée irréaliste sur `arborisis-photon-1` (volume Cinder réseau plafonné
 * à ~500 IOPS aléatoires, ~1% de progression en 2h25 sur la passe qui relit
 * l'index des nœuds — projection à plusieurs jours). Basculé sur une
 * extraction (`pmtiles extract`, pas de génération locale, juste des
 * requêtes HTTP Range) depuis le build planète gratuit de Protomaps
 * (`https://data.source.coop/protomaps/openstreetmap/v4.pmtiles`, licence
 * ODbL comme toute donnée OSM) — élimine le goulot d'I/O par construction,
 * mais impose ce schéma de couches différent. Toutes les couches
 * ci-dessous ont été retraduites depuis leurs équivalents OpenMapTiles.
 *
 * Une fonction plutôt qu'un `.json` statique : l'URL du fichier `.pmtiles`
 * dépend de l'environnement (bootstrap dev same-origin vs Object Storage/CDN
 * en production, voir §7.4) et n'est connue qu'au runtime.
 *
 * Couleurs : reprises littéralement de packages/design-tokens/src/tokens.css
 * (un style MapLibre ne peut pas référencer une variable CSS) — ne pas
 * dériver de nouvelle couleur ici sans mettre à jour les tokens d'abord
 * (système fermé, voir CLAUDE.md §3). Aucune couleur saturée : tout est une
 * variation d'opacité de `--color-ink` sur `--color-paper`, cohérent avec
 * l'esthétique monochrome du reste de l'app plutôt que d'introduire un bleu
 * pour l'eau ou un vert pour la végétation.
 */

const PAPER = "#fafaf8"; // --color-paper
const INK = "32, 30, 27"; // --color-ink, composantes RGB pour rgba()

// Pas de couches de texte (labels rues/lieux/POI) dans cette première
// version : le handoff §3.1 est explicite ("pas de labels de rues en
// surcharge [...] laisser la priorité visuelle aux marqueurs
// d'enregistrements") et une couche `symbol` avec `text-field` exigerait une
// ressource `glyphs` externe supplémentaire (serveur de glyphs PBF) — une
// dépendance de plus non justifiée pour ce que le design demande. À
// reconsidérer uniquement si un besoin d'orientation minimal (pays/grandes
// villes) est validé côté design.

export function buildQuietCartographyStyle(pmtilesUrl: string): StyleSpecification {
  return {
    version: 8,
    name: "Quiet Cartography",
    // Pas de `glyphs` : aucune couche `symbol`/texte dans ce style, voir
    // commentaire en tête de fichier.
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
        // Attribution ODbL requise pour toute donnée OpenStreetMap — voir
        // plan/07 §7.6. Protomaps lui-même (code + schéma) est BSD-3, aucune
        // attribution supplémentaire requise pour cette partie.
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": PAPER } },

      // --- Nature : végétation/eau en aplat très atténué, pas de couleur saturée ---
      {
        id: "landcover-wood",
        type: "fill",
        source: "protomaps",
        "source-layer": "landcover",
        filter: ["==", ["get", "kind"], "forest"],
        paint: { "fill-color": `rgba(${INK}, 0.045)` },
      },
      {
        id: "landcover-grass",
        type: "fill",
        source: "protomaps",
        "source-layer": "landcover",
        filter: ["in", ["get", "kind"], ["literal", ["grassland", "scrub"]]],
        paint: { "fill-color": `rgba(${INK}, 0.03)` },
      },
      {
        id: "landuse-wetland",
        type: "fill",
        source: "protomaps",
        "source-layer": "landuse",
        filter: ["==", ["get", "kind"], "wetland"],
        paint: { "fill-color": `rgba(${INK}, 0.03)` },
      },
      {
        id: "park",
        type: "fill",
        source: "protomaps",
        "source-layer": "landuse",
        filter: ["==", ["get", "kind"], "park"],
        paint: { "fill-color": `rgba(${INK}, 0.04)` },
      },
      {
        id: "water",
        type: "fill",
        source: "protomaps",
        "source-layer": "water",
        paint: { "fill-color": `rgba(${INK}, 0.08)` },
      },
      {
        id: "waterway",
        type: "line",
        source: "protomaps",
        // Rivières/ruisseaux vivent dans la même source-layer "water" que
        // les polygones (distingués par géométrie LineString, pas une
        // source-layer séparée comme "waterway" en OpenMapTiles) — un layer
        // MapLibre `type: "line"` ne rend de toute façon que les géométries
        // LineString de la source-layer, filtre par `kind`/`kind_detail`
        // inutile pour obtenir le même résultat que l'ancien style OMT.
        "source-layer": "water",
        paint: { "line-color": `rgba(${INK}, 0.12)`, "line-width": 0.6 },
      },

      // --- Bâti : n'apparaît qu'à partir d'un zoom élevé, contour fin seul ---
      {
        id: "building-fill",
        type: "fill",
        source: "protomaps",
        "source-layer": "buildings",
        filter: ["==", ["get", "kind"], "building"],
        minzoom: 15,
        paint: { "fill-color": `rgba(${INK}, 0.03)` },
      },
      {
        id: "building-outline",
        type: "line",
        source: "protomaps",
        "source-layer": "buildings",
        filter: ["==", ["get", "kind"], "building"],
        minzoom: 15,
        paint: { "line-color": `rgba(${INK}, 0.12)`, "line-width": 0.5 },
      },

      // --- Routes : hiérarchie discrète, largeur croissante avec le zoom ---
      {
        id: "transportation-minor",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        filter: ["in", ["get", "kind"], ["literal", ["minor_road", "path"]]],
        minzoom: 12,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": `rgba(${INK}, 0.12)`,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.4, 18, 1.2],
        },
      },
      {
        id: "transportation-major",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        // "highway" = motorway/trunk, "major_road" = primary/secondary/tertiary
        // dans le schéma Protomaps — regroupement différent d'OpenMapTiles
        // mais même intention visuelle (voies principales uniquement).
        filter: ["in", ["get", "kind"], ["literal", ["highway", "major_road"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": `rgba(${INK}, 0.18)`,
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 12, 0.8, 18, 2.2],
        },
      },

      // --- Frontières : trait pointillé très discret, pays/régions seulement ---
      {
        id: "boundary",
        type: "line",
        source: "protomaps",
        "source-layer": "boundaries",
        filter: ["in", ["get", "kind"], ["literal", ["country", "region"]]],
        layout: { "line-join": "round" },
        paint: {
          "line-color": `rgba(${INK}, 0.18)`,
          "line-width": 0.6,
          "line-dasharray": [3, 2],
        },
      },
    ],
  };
}

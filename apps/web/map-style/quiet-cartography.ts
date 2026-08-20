import type { StyleSpecification } from "maplibre-gl";

/**
 * Style MapLibre "Quiet Cartography" — écrit à la main (pas un style tiers
 * importé, voir plan/07-carte-open-source.md §7.6) pour reproduire "contours
 * fins, absence de tuiles satellite saturées, marqueurs discrets"
 * (design/handoff/DEV-HANDOFF.md §3.1).
 *
 * Cible le **schéma OpenMapTiles** (couches `water`, `landcover`, `building`,
 * `transportation`, etc. — voir openmaptiles.org/schema), pas le schéma
 * propriétaire de Protomaps : c'est le schéma produit par le jar Planetiler
 * officiel (`onthegomap/planetiler`) utilisé par infra/tiles/generate.sh,
 * voir infra/tiles/README.md pour le pourquoi de ce choix.
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
      openmaptiles: {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
        attribution: "© OpenMapTiles © OpenStreetMap contributors",
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": PAPER } },

      // --- Nature : végétation/eau en aplat très atténué, pas de couleur saturée ---
      {
        id: "landcover-wood",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "wood"],
        paint: { "fill-color": `rgba(${INK}, 0.045)` },
      },
      {
        id: "landcover-grass",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["grass", "wetland"]]],
        paint: { "fill-color": `rgba(${INK}, 0.03)` },
      },
      {
        id: "park",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "park",
        paint: { "fill-color": `rgba(${INK}, 0.04)` },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": `rgba(${INK}, 0.08)` },
      },
      {
        id: "waterway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "waterway",
        paint: { "line-color": `rgba(${INK}, 0.12)`, "line-width": 0.6 },
      },

      // --- Bâti : n'apparaît qu'à partir d'un zoom élevé, contour fin seul ---
      {
        id: "building-fill",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 15,
        paint: { "fill-color": `rgba(${INK}, 0.03)` },
      },
      {
        id: "building-outline",
        type: "line",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 15,
        paint: { "line-color": `rgba(${INK}, 0.12)`, "line-width": 0.5 },
      },

      // --- Routes : hiérarchie discrète, largeur croissante avec le zoom ---
      {
        id: "transportation-minor",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["minor", "service", "track", "path"]]],
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
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]],
        ],
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
        source: "openmaptiles",
        "source-layer": "boundary",
        filter: ["all", ["<=", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
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

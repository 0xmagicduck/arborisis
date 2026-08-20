/**
 * Géocodage — Phase 4, voir plan/07-carte-open-source.md §7.5. Appelé
 * directement depuis le navigateur (pas via l'API Arborisis) : l'instance
 * publique de démonstration Photon (komoot) envoie `Access-Control-Allow-Origin: *`
 * (vérifié en conditions réelles), donc pas besoin de proxy backend en
 * bootstrap. À remplacer par une instance auto-hébergée avant le lancement
 * public — un seul changement d'URL (`NEXT_PUBLIC_PHOTON_URL`), même logique
 * que le fond de carte (§7.4).
 */

const PHOTON_URL = process.env.NEXT_PUBLIC_PHOTON_URL ?? "https://photon.komoot.io/api";

export interface PlaceSuggestion {
  /** "Lieu, Pays" — voir packages/db/src/schema.ts `locationLabel`. */
  label: string;
  lat: number;
  lng: number;
}

interface PhotonFeature {
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry: { coordinates: [number, number] };
}

/** Composition du libellé "Lieu, Pays" à partir d'une feature Photon. */
function labelFromFeature(properties: PhotonFeature["properties"]): string {
  const place = properties.name ?? properties.city ?? properties.state;
  return [place, properties.country].filter(Boolean).join(", ") || (place ?? "");
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `${PHOTON_URL}?q=${encodeURIComponent(trimmed)}&limit=5`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Géocodage échoué (${res.status})`);

  const body: { features: PhotonFeature[] } = await res.json();
  return body.features
    .filter((f) => f.properties.name || f.properties.city)
    .map((f) => ({
      label: labelFromFeature(f.properties),
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));
}

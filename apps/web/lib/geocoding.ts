/**
 * Géocodage — Phase 4 bootstrap → Phase 5 auto-hébergé, voir
 * plan/07-carte-open-source.md §7.5. Jusqu'en Phase 4, le navigateur
 * appelait directement l'instance publique de démonstration Photon (CORS
 * ouvert, vérifié en conditions réelles). Depuis l'auto-hébergement
 * (Phase 5), l'instance de production vit sur un réseau privé sans IP
 * publique (voir infra/photon/README.md) : le navigateur ne peut plus
 * l'atteindre directement, d'où le passage par un proxy `GET /geocode` côté
 * API (voir apps/api/src/routes/geocode.ts). Comportement identique côté
 * appelant — seule la destination réseau change.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

  const url = `${API_URL}/geocode?q=${encodeURIComponent(trimmed)}`;
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

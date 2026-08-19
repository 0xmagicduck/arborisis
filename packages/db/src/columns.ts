import { customType } from "drizzle-orm/pg-core";

/**
 * Colonne `geography(Point, 4326)` PostGIS — voir plan/08-donnees-et-recherche.md §8.1.
 *
 * Le driver `pg` renvoie une géographie en EWKB hexadécimal par défaut, pas en
 * JSON exploitable directement : on écrit via `ST_MakePoint`/`ST_SetSRID` (voir
 * `toDriver`) et on lit en passant explicitement par `ST_X`/`ST_Y` dans les
 * requêtes (voir Phase 4 — clustering/viewport, plan/08 §8.2), plutôt que de
 * tenter un décodage WKB générique ici.
 *
 * ⚠️ Piège `drizzle-kit generate` : sa liste interne de types PostgreSQL
 * "natifs" contient "geometry" mais pas "geography" (voir
 * pgNativeTypes dans drizzle-kit/bin.cjs) — toute regénération de migration
 * touchant cette colonne ressort donc avec le type entre guillemets
 * (`"geography(Point, 4326)"`, invalide en SQL) et doit être corrigée à la
 * main dans le fichier `.sql` généré en retirant ces guillemets avant de
 * l'appliquer (fait pour 0000_absent_molecule_man.sql).
 */
export const geographyPoint = customType<{
  data: { lat: number; lng: number };
  driverData: string;
}>({
  dataType() {
    return "geography(Point, 4326)";
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
});

#!/usr/bin/env bash
# Génération du fichier .pmtiles — voir plan/07-carte-open-source.md §7.3.
#
# Reproductible et paramétrable par région : ne fixe PAS l'emprise
# géographique de production (§7.7, encore "à trancher" — dépend des
# premières zones où la communauté est attendue). Sert à (re)générer le
# fichier pour n'importe quel extrait Geofabrik, du premier test dev à la
# région de production une fois décidée.
#
# Usage :
#   REGION=europe/luxembourg ./generate.sh
#   REGION=europe/belgium ./generate.sh
# (chemin Geofabrik sans le "-latest.osm.pbf" final, voir
# https://download.geofabrik.de/ pour la liste des extraits disponibles —
# continents, pays, et certains découpages infra-nationaux.)
#
# Prérequis : un JDK 21+ sur le PATH (`java -version`). Pas de dépendance
# Docker : le jar Planetiler officiel tourne directement, plus simple à
# reproduire en CI (voir .github/workflows/ci.yml pour un job dédié si la
# génération doit un jour y être automatisée).
set -euo pipefail

REGION="${REGION:?Usage: REGION=europe/luxembourg ./generate.sh (chemin Geofabrik, voir download.geofabrik.de)}"
PLANETILER_VERSION="${PLANETILER_VERSION:-latest}"
OUT_DIR="${OUT_DIR:-$(dirname "$0")/dist}"
REGION_NAME="$(basename "$REGION")"

mkdir -p "$OUT_DIR"
cd "$OUT_DIR"

JAR="planetiler.jar"
if [ ! -f "$JAR" ]; then
  echo "→ Téléchargement de Planetiler ($PLANETILER_VERSION)…"
  curl -sL -o "$JAR" \
    "https://github.com/onthegomap/planetiler/releases/${PLANETILER_VERSION}/download/planetiler.jar"
fi

PBF="${REGION_NAME}-latest.osm.pbf"
if [ ! -f "$PBF" ]; then
  echo "→ Téléchargement de l'extrait OSM ($REGION)…"
  curl -sL -o "$PBF" "https://download.geofabrik.de/${REGION}-latest.osm.pbf"
fi

echo "→ Génération de ${REGION_NAME}.pmtiles (profil OpenMapTiles)…"
# --download : récupère les jeux de données auxiliaires globaux requis par le
# profil OpenMapTiles (lake_centerlines, water_polygons, natural_earth — pour
# les côtes/lacs/étiquettes bas-zoom). Mis en cache dans data/sources/ et
# réutilisé d'une région à l'autre, pas retéléchargé à chaque exécution.
java -Xmx4g -jar "$JAR" \
  --download \
  --osm-path="$PBF" \
  --output="${REGION_NAME}.pmtiles" \
  --force

echo "→ Terminé : ${OUT_DIR}/${REGION_NAME}.pmtiles"
echo
echo "Attribution requise par la licence OpenMapTiles (CC-BY) sur toute carte"
echo "utilisant ce fichier : « © OpenMapTiles © OpenStreetMap contributors »"
echo "— voir apps/web/components/ExplorerMap.tsx (attribution déjà câblée)."
echo
echo "Dépôt sur Object Storage (exemple, adapter à l'environnement visé) :"
echo "  aws --endpoint-url \$OBJECT_STORAGE_ENDPOINT s3 cp ${REGION_NAME}.pmtiles s3://\$OBJECT_STORAGE_BUCKET/tiles/${REGION_NAME}.pmtiles"
echo "Puis pointer NEXT_PUBLIC_PMTILES_URL vers l'URL publique correspondante"
echo "(bootstrap vs prod = un seul changement d'URL, voir plan/07 §7.4)."

# Génération des tuiles `.pmtiles`

Voir [plan/07-carte-open-source.md](../../plan/07-carte-open-source.md) pour
le contexte complet (pourquoi Planetiler/PMTiles, bootstrap vs production).

## Utilisation

```bash
REGION=europe/luxembourg ./generate.sh
```

`REGION` est un chemin [Geofabrik](https://download.geofabrik.de/) (continent,
pays, ou certains découpages infra-nationaux selon les régions), sans le
`-latest.osm.pbf` final. Le script :

1. télécharge le jar Planetiler officiel (mis en cache dans `dist/`) ;
2. télécharge l'extrait `.osm.pbf` correspondant ;
3. télécharge (une seule fois, réutilisé ensuite) les jeux de données
   auxiliaires globaux requis par le profil OpenMapTiles (`lake_centerlines`,
   `water_polygons`, `natural_earth` — côtes, lacs, étiquettes bas-zoom) ;
4. génère `dist/<région>.pmtiles`.

Prérequis : un JDK 21+ sur le PATH. Aucune dépendance Docker.

## Schéma des tuiles : OpenMapTiles, pas Protomaps

Le jar `planetiler.jar` officiel (`onthegomap/planetiler`) génère des tuiles
au **schéma OpenMapTiles** (couches `water`, `landcover`, `landuse`, `park`,
`boundary`, `transportation`, `building`, `place`, `poi`, etc. — voir
[openmaptiles.org/schema](https://openmaptiles.org/schema/)), pas le schéma
propriétaire du projet Protomaps (`protomaps/basemaps`, un outil séparé). Le
style MapLibre écrit à la main dans
[apps/web/map-style/quiet-cartography.json](../../apps/web/map-style/quiet-cartography.json)
cible donc le schéma OpenMapTiles — c'est aussi le choix qui a permis de
générer nous-mêmes le premier fichier réel dès cette session plutôt que de
dépendre d'un bootstrap tiers (voir §7.4 : le bucket de démo public
Protomaps `demo-bucket.protomaps.com` n'envoie d'ailleurs aucun header CORS,
inutilisable directement depuis un navigateur — constaté en testant).

## Attribution (licence CC-BY, obligatoire)

Planetiler l'affiche explicitement à la fin de chaque génération :

> Generated vector tiles are produced work of OpenStreetMap data. Such tiles
> are reusable under CC-BY license granted by OpenMapTiles team. Maps made
> with these vector tiles must display a visible credit: **© OpenMapTiles ©
> OpenStreetMap contributors**

Câblé dans `apps/web/components/ExplorerMap.tsx` (attribution control
MapLibre) — ne pas retirer.

## Emprise de production : encore à trancher

Le premier fichier généré pendant la session Phase 4 couvre le **Luxembourg**
(petit extrait rapide à générer, ~36 Mo, suffisant pour valider tout le
pipeline Planetiler → PMTiles → MapLibre en conditions réelles). Ce n'est
**pas** une décision de l'emprise géographique de production — celle-ci reste
"à trancher" selon plan/07 §7.7 (dépend des premières zones où la communauté
est attendue). Regénérer avec `REGION=` pointant vers la bonne emprise le
moment venu ne change que ce fichier, pas le code.

## Dev local : servir le fichier sans Object Storage

En dev, le fichier généré est copié dans `apps/web/public/tiles/` (voir
`.gitignore` — jamais commité, c'est un artefact généré, pas du code source)
et servi en same-origin par Next.js, ce qui évite tout problème de CORS avec
zéro configuration :

```bash
cp dist/luxembourg.pmtiles ../../apps/web/public/tiles/
```

`NEXT_PUBLIC_PMTILES_URL` (voir `.env.example`) pointe par défaut vers
`/tiles/luxembourg.pmtiles` (same-origin). En production, la même variable
pointe vers l'Object Storage/CDN (`pmtiles://https://tiles.arborisis.com/...`,
voir plan/07 §7.4) — aucun changement de code, un seul changement d'URL.

## Dépôt sur Object Storage (production)

```bash
aws --endpoint-url "$OBJECT_STORAGE_ENDPOINT" s3 cp \
  dist/<région>.pmtiles "s3://$OBJECT_STORAGE_BUCKET/tiles/<région>.pmtiles"
```

Le container doit être **public en lecture** (contrairement à
`arborisis-storage` pour les enregistrements, qui reste privé, voir plan/05
§5.10) — PMTiles est interrogé directement par le navigateur via des requêtes
`Range` HTTP, sans passer par l'API, donc sans authentification possible côté
requête individuelle.

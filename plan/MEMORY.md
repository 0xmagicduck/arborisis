# Mémoire — pièges déjà rencontrés

Contrairement au [journal de session](TASKS.md#journal-de-session) (chronologique,
« qu'est-ce qui a été fait quand »), ce fichier est organisé par thème : **avant
de retoucher une zone du code listée ici, relire l'entrée correspondante**. Le
but est de ne pas re-découvrir deux fois le même piège.

Chaque entrée : le piège, pourquoi il s'est produit, la règle à appliquer.

---

## Frontend / Next.js (apps/web)

**En Next.js 15 App Router, la prop `params` d'une page est typée
`Promise<...>` même pour un client component** (`"use client"`) — utiliser
`params` directement comme un objet synchrone échoue au build avec une
erreur de type opaque (`Type '{ params: {...} }' does not satisfy the
constraint 'PageProps'`). Pour une page client (le cas de tous les écrans du
MVP, voir §3 de CLAUDE.md), utiliser `useParams()` de `next/navigation`
plutôt que la prop `params` — pas d'`await`/`use()` à gérer, et le typage
reste stable. Rencontré sur
[apps/web/app/enregistrements/\[id\]/page.tsx](../apps/web/app/enregistrements/[id]/page.tsx).

**`useSearchParams()` exige une frontière `<Suspense>`** autour du composant
qui l'appelle, sinon `next build` bascule silencieusement toute la page en
rendu client-only avec un avertissement — pas une erreur bloquante, mais un
comportement dégradé à ne pas laisser passer. Séparer le composant qui
utilise ce hook dans un enfant enveloppé par `<Suspense fallback={...}>` (le
fallback doit rester visuellement cohérent, pas un simple spinner générique —
voir DEV-HANDOFF §5). Rencontré sur [apps/web/app/page.tsx](../apps/web/app/page.tsx)
(Explorer, paramètre `?focus=<id>` pour le recentrage depuis RecordingDetail).

**Sourcer le même `.env` dans le même shell pour lancer `apps/api` et
`apps/web` en dev fait que `next dev` hérite de `PORT=4000`** (variable
destinée à l'API) et se bind dessus au lieu de 3000, en conflit silencieux
avec Fastify — les deux process peuvent temporairement se marcher dessus
selon l'ordre de démarrage/redémarrage. Lancer `next dev` avec `PORT` explicitement
absent de l'environnement (`env -u PORT ...`) ou avec `-p 3000` explicite.
Voir §6 de CLAUDE.md pour la commande complète.

**`tsx watch` (apps/api) peut entrer en boucle `EADDRINUSE`** si son
processus redémarre pendant qu'un port qu'il tentait de libérer est
capturé entre-temps par un autre process (observé pendant une session de
vérification manuelle avec plusieurs redémarrages rapprochés liés à
`pnpm install`/`pnpm build` touchant `node_modules`). Pour une vérification
manuelle ponctuelle sans besoin de hot-reload, préférer `npx tsx
src/index.ts` (sans `watch`) — plus stable, un seul process, pas de course
au port.

**`maplibre-gl` importé statiquement dans une page fait planter `next build`
avec une erreur `<Html> should not be imported outside of pages/_document`
sans rapport apparent.** La page reste `"use client"` et n'affiche pourtant
aucune erreur de logique — le message pointe vers `next/document`, pas vers
MapLibre. Cause réelle : Next.js fait quand même un rendu serveur (SSR) des
pages `"use client"` pour la génération statique au build, et `maplibre-gl`
fait des accès WebGL/`window` au chargement du module qui plantent sous Node
— l'erreur `_document` est un message secondaire qui masque le vrai crash.
Corrigé en isolant le composant carte du rendu serveur avec `next/dynamic`
(`{ ssr: false }`) plutôt qu'en désactivant le SSR de toute la page — voir
[apps/web/app/page.tsx](../apps/web/app/page.tsx). Repéré en comparant un
`next build` avant/après stash des changements Phase 4 : la Phase 3 seule
buildait proprement (10/10 pages statiques), la régression n'est apparue
qu'avec l'import direct de `components/ExplorerMap.tsx`.

**`height: 100%` sur un enfant statique d'un conteneur dont la hauteur vient
d'un `flex: 1` (colonne flex) peut rester à une hauteur minuscule au lieu de
remplir le parent**, malgré un parent mesurant correctement sa vraie hauteur
via `getBoundingClientRect()` — l'ambiguïté vient de la résolution CSS des
pourcentages de hauteur ("hauteur spécifiée" vs valeur `auto` propagée par
flex-grow), qui varie selon les moteurs de rendu. Constaté sur la carte
Explorer, confinée à ~67px de haut au lieu de toute la zone `.mapArea`
disponible. Corrigé en remplaçant `width/height: 100%` par `position:
absolute; inset: 0` contre un ancêtre `position: relative` — dimensions de la
boîte de padding toujours bien définies, pas d'ambiguïté. Voir
[apps/web/components/ExplorerMap.module.css](../apps/web/components/ExplorerMap.module.css).
À garder en tête pour tout futur composant plein-cadre logé dans un enfant de
conteneur flex à hauteur dynamique.

**Éditer plusieurs fichiers CSS Modules coup sur coup pendant que `next dev`
tourne peut faire dériver le cache HMR** (`Cannot find module './NNN.js'`,
`__webpack_modules__[moduleId] is not a function`) — pas un bug de code,
symptôme observé deux fois en Phase 5 après une salve d'édits sur des
composants déjà montés. Corrigé à chaque fois par un restart propre
(`rm -rf .next` puis relance) plutôt qu'en cherchant la cause dans le code
modifié.

## Fastify / API

**`setErrorHandler` doit être enregistré AVANT les plugins de routes.**
Fastify encapsule chaque `.register()` dans son propre contexte ; un handler
d'erreur posé sur la racine *après* que des routes ont déjà été enregistrées
ne redescend pas dans ces contextes enfants. Conséquence rencontrée : les
erreurs Zod dans `register`/`login` remontaient en 500 brut avec le détail Zod
complet exposé au client, au lieu d'un 400 propre. Voir [apps/api/src/app.ts](../apps/api/src/app.ts)
— l'ordre y est maintenant explicitement commenté, ne pas le réordonner sans
revérifier.

**Zod `.nullable()` ≠ `.optional()`.** Un champ `.nullable()` seul exige que la
clé soit présente dans le JSON (avec `null` ou la valeur) — une clé absente est
rejetée avec "Required". Pour un champ optionnel dans un payload d'entrée
(le client peut légitimement omettre la clé plutôt que d'envoyer `null`), il
faut les deux : `.optional()` en plus de `.nullable()`. Rencontré sur
`description`/`equipment` dans `createRecordingInputSchema`
([packages/shared-types/src/recording.ts](../packages/shared-types/src/recording.ts)) — corrigé en surchargeant ces deux
champs avec `.optional()` sur le schéma d'entrée uniquement (le schéma de
sortie `recordingSchema` reste volontairement strict : une réponse API a
toujours la clé, jamais omise).

**Ne pas nommer une décoration Fastify `search`.** Fastify déclare déjà
`fastify.search(path, opts, handler)` comme raccourci de route pour la
méthode HTTP `SEARCH` (au même titre que `.get`/`.post`) — décorer
`fastify.search` avec autre chose (ex. un client Meilisearch) produit une
collision de type à la compilation (`TS2717: Subsequent property
declarations must have the same type`), pas une erreur au runtime : le code
tourne mais `tsc` échoue avec un message qui ne mentionne pas Meilisearch,
piégeant à identifier. Renommé en `fastify.meilisearch` — voir
[apps/api/src/plugins/search.ts](../apps/api/src/plugins/search.ts).

**`noUncheckedIndexedAccess` (activé dans `tsconfig.base.json`) attrape deux
cas non-évidents avec MapLibre/GeoJSON :** (1) une `Position` GeoJSON est
typée `number[]` générique (pas un tuple `[number, number]`, car une position
peut porter une altitude) — déstructurer `const [lng, lat] = coords` donne
`number | undefined` ; utiliser des valeurs par défaut (`const [lng = 0, lat
= 0] = ...`) plutôt que de désactiver la règle. (2) assigner une classe CSS
Modules à `element.className` (API DOM native, typée `string` strict) plutôt
qu'à un prop JSX `className` (qui accepte `string | undefined`) échoue si les
classes sont typées via une index signature — nécessite `?? ""`. Rencontré en
pilotant des `maplibregl.Marker` HTML à la main dans
[apps/web/components/ExplorerMap.tsx](../apps/web/components/ExplorerMap.tsx).

## packages/db (Drizzle + PostGIS)

**`drizzle-kit generate` quote à tort `geography(Point, 4326)`** — sa liste
interne de types PostgreSQL "natifs" contient `geometry` mais pas `geography`
(voir `pgNativeTypes` dans `drizzle-kit/bin.cjs`). Toute regénération de
migration touchant la colonne `location_point` ressort avec le type entre
guillemets (SQL invalide) et doit être corrigée à la main en retirant les
guillemets. Documenté et piégé dans [packages/db/src/columns.ts](../packages/db/src/columns.ts).

**`new URL(...).pathname` casse le chemin des migrations si le repo est sous
un dossier contenant des espaces** (ex. `.../Arborisis V2/...`) — les espaces
restent encodés en `%20`. Utiliser `fileURLToPath` à la place, voir
[packages/db/src/migrate.ts](../packages/db/src/migrate.ts).

**`drizzle-kit generate` ouvre un prompt interactif (détection de rename de
colonne) qui ne peut pas s'exécuter dans cet environnement non interactif**
(le process rend la main sans écrire de fichier, sans erreur explicite). Pour
un rename de colonne, écrire la migration SQL à la main
(`ALTER TABLE ... RENAME COLUMN ...`) **et** régénérer manuellement
`migrations/meta/000N_snapshot.json` (copier le snapshot précédent, changer
`id`/`prevId`, renommer les clés de colonnes concernées) + une entrée dans
`migrations/meta/_journal.json`. Revérifier avec `pnpm db:generate < /dev/null`
ensuite : "No schema changes, nothing to migrate" confirme que le snapshot
écrit à la main correspond exactement à `schema.ts`. Fait pour
`0001_rename_recording_storage_keys.sql`.

**Lire `location_point` (type `geography`) via l'ORM relationnel
(`db.query.recordings.findFirst`) renvoie l'EWKB brut, pas `{lat,lng}`** — le
`customType` dans `columns.ts` ne définit que `toDriver` (écriture), pas de
décodage en lecture. Pour toute requête qui a besoin de lat/lng, utiliser
`db.select({...})` avec `sql`ST_X(${recordings.locationPoint}::geometry)``/
`ST_Y(...)` explicites plutôt que le query builder relationnel. Voir
`recordingSelection` dans [apps/api/src/routes/recordings.ts](../apps/api/src/routes/recordings.ts).

**`drizzle-orm` < 0.45.2 a une vulnérabilité SQLi réelle** (identifiants SQL
mal échappés, GHSA-gpj5-g38j-94v9) — trouvée par `pnpm audit --prod` en
Phase 5, pas seulement transitive : ce dépôt l'utilisait directement en
0.36.4. Bump vers 0.45.2 (+ `drizzle-kit` vers 0.31.10) sans régression
constatée — `pnpm db:generate` ne détecte aucun changement de schéma
inattendu, et les requêtes `sql\`ST_X/ST_Y\`` sur `location_point` (la zone
la plus susceptible de casser avec un bump majeur de l'ORM, voir plus haut)
continuent de fonctionner contre un Postgres réel.

## Object Storage (S3-compatible)

**`pg_dump`/`pg_restore` doivent être de version majeure ≤ celle du serveur
cible, pas seulement "compatibles".** Homebrew (`brew install libpq`)
installe par défaut la dernière version majeure (18.x à l'écriture) — dumper
depuis un serveur PostgreSQL 16 avec un client 18 produit un dump qui contient
`SET transaction_timeout = 0` (directive introduite en PG17), que le serveur
16 ne reconnaît pas à la restauration (`pg_restore: error: could not execute
query: ERROR: unrecognized configuration parameter "transaction_timeout"`).
Corrigé en installant la version exacte du serveur en parallèle
(`brew install postgresql@16`, binaires sous
`/opt/homebrew/opt/postgresql@16/bin`) plutôt que le `libpq` générique.
Rencontré en Phase 5 en testant `apps/backup` contre le Postgres 16.4 du
`docker-compose.yml` de dev.

**La passerelle S3-compat d'Infomaniak exige la région SigV4 `"us-east-1"`,
pas la région OpenStack réelle** (`dc3-a`/`dc4-a`) — toute autre valeur est
rejetée avec `AuthorizationHeaderMalformed`. La région OpenStack n'a ici aucun
rôle : c'est `endpoint` (ex. `https://s3.pub1.infomaniak.cloud`) qui fixe la
région physique. MinIO accepte `"us-east-1"` sans problème, donc c'est la
valeur par défaut partout (`.env.example`, `apps/api`, `apps/worker`).
Documenté dans [packages/storage/src/config.ts](../packages/storage/src/config.ts). Vérifié en conditions
réelles contre le container `arborisis-storage` (put/head/presign GET/delete).

**Les credentials S3 (EC2) d'Infomaniak ne sont pas générées par défaut** —
`openstack ec2 credentials create` une fois par projet. Cette commande crée un
secret : elle est bloquée par le classificateur de permissions automatique
dans cet environnement, demander confirmation explicite avant de la relancer.

**Le container Object Storage est privé** (Terraform, `container_read = ""`).
Ne jamais persister d'URL de lecture stable en base pour `original`/`proxy` —
stocker la **clé** (`original_key`/`proxy_key`) et calculer une URL pré-signée
à la volée à chaque réponse API (`presignGetUrl`, TTL 1h). Voir
[plan/05-stockage-audio-internet-archive.md](05-stockage-audio-internet-archive.md#58-modèle-de-données-ajouts).

## Worker (ffmpeg/ffprobe)

**La source `sine` de ffmpeg (testé sur 8.1.2, Homebrew) ne génère pas du
plein échelle par défaut** — amplitude mesurée ±4095 sur du PCM s16 (pas
±32767). Une fixture de test qui suppose une amplitude proche de 1.0 pour un
signal "à pleine puissance" se trompe : vérifier la cohérence relative des
valeurs (peaks non nuls, plausibles entre eux), pas une valeur absolue liée à
un détail d'implémentation du générateur. Rencontré dans
[apps/worker/src/__tests__/audio.test.ts](../apps/worker/src/__tests__/audio.test.ts).

**ffmpeg/ffprobe sont résolus via le PATH système** (`FFMPEG_PATH`/
`FFPROBE_PATH` dans `apps/worker/src/config.ts`), pas via les paquets npm
`ffmpeg-static`/`ffprobe-static` (~80 Mo de binaires téléchargés au
postinstall, superflus quand un ffmpeg système suffit partout où le worker
tourne réellement). CI installe ffmpeg via `apt-get` avant les tests — si un
test worker touchant `lib/audio.ts` échoue en CI mais pas en local, vérifier
d'abord que cette étape existe toujours dans `.github/workflows/ci.yml`.

**Sur échec définitif d'un job (5 tentatives épuisées), le fichier staging
n'est jamais nettoyé** — seul le chemin de succès purge `staging/`. Sans
conséquence fonctionnelle (`status` passe bien à `failed`) mais laisse des
objets orphelins. Pas de tâche de nettoyage périodique pour l'instant, voir
[plan/05 §5.9](05-stockage-audio-internet-archive.md#59-à-trancher).

## Infra / Infomaniak Public Cloud (Object Storage, réseau)

**Aucun gabarit de VM Infomaniak n'offre de grand disque racine** (max 80 Go
en catalogue, voir `openstack flavor list`) — pour un besoin de stockage
important (ex. index Photon planète, 90 Go), attacher un **volume Cinder
séparé** (`openstack volume create` + `openstack server add volume`) plutôt
que de chercher un gabarit avec plus de disque. Le device apparaît côté VM
sous un nom différent de celui annoncé par `openstack volume show` (`/dev/sdc`
annoncé, vu comme `/dev/sdb` dans la VM) — vérifier avec `lsblk` plutôt que de
supposer le nom de device. Rencontré en Phase 5, voir `infra/photon/README.md`.

**Deux couches de pare-feu indépendantes sur une VM Infomaniak provisionnée
via `cloud-init.yaml` de ce dépôt : le security group Neutron (niveau réseau
OpenStack) ET `ufw` (niveau hôte, activé par le cloud-init lui-même, qui
n'ouvre que 22/80/443 par défaut).** Configurer le security group pour
autoriser un port ne suffit pas si ce port n'est pas aussi ouvert dans `ufw`
— la connexion timeout silencieusement (pas de "connection refused" net, un
vrai timeout, ce qui pointe plutôt vers un problème réseau/routage qu'un
firewall applicatif, piégeant à diagnostiquer). Vérifier les deux couches
systématiquement pour tout nouveau port sur une VM basée sur ce cloud-init.
Rencontré en Phase 5 en ouvrant le port 2322 (Photon) au réseau privé — voir
`infra/photon/README.md`.

**Le container Object Storage Infomaniak ne semble pas honorer le CORS Swift
natif (`X-Container-Meta-Access-Control-Allow-Origin`, posé via
`openstack container set --property`) et son API S3-compatible ne supporte
pas `PutBucketCors` (`501 NotImplemented`)** — testé et confirmé par les deux
voies en Phase 5 (voir `infra/photon/README.md` et `infra/caddy/Caddyfile`).
Un fichier destiné à être fetché en cross-origin par le navigateur (ex.
`.pmtiles` pour MapLibre) ne peut donc pas être pointé directement vers l'URL
du bucket — le contourner avec un proxy same-origin (Caddy `reverse_proxy`,
avec `Range` requests transmises nativement) plutôt que de chercher plus loin
un réglage CORS côté Infomaniak.

**L'ACL de lecture publique d'un container (`X-Container-Read`) posée via
`openstack container set --property` sur ce compte n'a eu aucun effet
observable** (toujours `401 Unauthorized` en HTTP anonyme après plusieurs
minutes d'attente) — l'activation via le **Manager Infomaniak** (interface
web) a fonctionné immédiatement. Pas d'explication trouvée (le champ
`read_acl` remonte pourtant correctement dans `openstack container show`
après coup) — si l'ACL CLI ne prend pas effet, essayer le Manager avant de
creuser plus loin côté CLI.

**Un volume Cinder Infomaniak (`CEPH_1_perf1`) plafonne à ~500 IOPS en
lecture aléatoire 4 Ko, quelle que soit la RAM/CPU de la VM attachée.**
Rencontré en tentant de générer un `.pmtiles` Europe avec Planetiler sur
`arborisis-photon-1` (32 Go RAM, 8 vCPU) : la passe `osm_pass2` (relit de
façon aléatoire l'index des positions de nœuds construit en pass1, mmap sur
le volume de données) n'a traité que 1% des données en 2h25 — `iostat -x`
confirmait `%util` à 100% en continu sur `/dev/sdb`, `~500 r/s` stables,
`iowait` 60-75%, alors que le CPU était quasi inactif (`cpus: 0.1`). Ce n'est
pas un problème temporaire ni réglable par plus de RAM/CPU : c'est une
caractéristique du stockage réseau (Ceph) pour ce pattern d'accès. **Règle
générale : tout traitement fortement dépendant d'I/O aléatoires (Planetiler
sur une grande emprise, un index de recherche construit sur disque, etc.)
doit soit tenir en RAM, soit s'exécuter sur un disque local, jamais sur un
volume Cinder réseau de ce type.** Contourné en évitant complètement le
traitement local : voir l'entrée `pmtiles extract` ci-dessous.

**`pmtiles extract` (CLI `go-pmtiles`) permet d'obtenir un extrait régional
d'un `.pmtiles` sans aucun traitement local ni téléchargement du fichier
complet** — juste des requêtes HTTP Range contre la source distante, donc
uniquement limité par la bande passante réseau, pas par les IOPS d'un
disque local. Le projet Protomaps publie un build planète entier
gratuitement (`https://data.source.coop/protomaps/openstreetmap/v4.pmtiles`,
~135 Go, licence ODbL, CORS ouvert, mise à jour régulière — voir
docs.protomaps.com/basemaps/downloads ; l'URL `build.protomaps.com` de la
documentation redirige vers une SPA, l'URL de téléchargement direct utilisable
en CLI/`curl` est en réalité sur `data.source.coop`, trouvée en listant le
bucket S3 sous-jacent). Toujours faire un `--dry-run` d'abord : l'extrait
Europe (bbox `-25,34,45,72`, maxzoom 14) pèse 24 Go, largement plus que
l'espace disque disponible sur une machine de dev typique — exécuter sur une
machine/VM avec assez d'espace plutôt que de découvrir l'erreur en cours de
transfert. **Piège rencontré** : le schéma de tuiles produit par les builds
Protomaps (`protomaps/basemaps` : couches `landcover`/`landuse`/`water`/
`buildings`/`roads`/`boundaries`) est **incompatible** avec le schéma
OpenMapTiles ciblé par Planetiler (voir `infra/tiles/README.md`) — tout style
MapLibre écrit pour l'un ne fonctionne pas avec l'autre, migration de schéma
= réécriture complète du style (voir `apps/web/map-style/quiet-cartography.ts`
pour la table de correspondance de couches utilisée).

**`pmtiles extract` contre un CDN distant peut échouer en cours de route**
(`stream error: ... INTERNAL_ERROR; received from peer`, rencontré à 94% de
progression contre `data.source.coop`) — pas de reprise partielle possible
(l'outil ne supporte pas le resume), il faut relancer depuis le début.
Réduire `--download-threads` (8 → 4) au retry pour limiter le risque de
resollicitation excessive du CDN — non confirmé comme cause certaine, mais
prudent en l'absence de meilleure piste.

## Déploiement / Docker (infra, Phase 6)

**`next build` inline les variables `NEXT_PUBLIC_*` dans le bundle client au
moment de la build, pas au runtime du conteneur.** Les poser uniquement dans
le `.env` du service `web` (`env_file:`, lu au démarrage du conteneur) n'a
aucun effet sur le JS déjà généré — le bundle appelait encore
`http://localhost:4000` (défaut codé dans `apps/web/lib/api.ts`) alors que le
conteneur avait bien la bonne valeur en variable d'environnement runtime.
Corrigé en passant `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_PMTILES_URL` en
**build-arg Docker** (`ARG`/`ENV` avant `RUN pnpm build` dans
`infra/docker/Dockerfile`, `build.args` dans `infra/docker-compose.yml`) —
règle générale pour toute variable `NEXT_PUBLIC_*` future : elle doit être
disponible **avant** `next build`, jamais seulement au démarrage du conteneur.

**Un mot de passe généré avec `openssl rand -base64 N` peut contenir `/`, `+`
ou `=`, qui cassent le parsing d'une URL de connexion Postgres
(`postgres://user:motdepasse@host/db`) si le mot de passe n'est pas
URL-encodé.** `new URL(...)` (utilisé en interne par `pg`/`drizzle-orm`) lève
une `ERR_INVALID_URL` peu explicite (`input: REDACTED, base: 'postgres://base'`)
plutôt qu'une erreur claire. Générer les mots de passe destinés à vivre dans
une connection string avec `openssl rand -hex N` (alphabet
alphanumérique uniquement) plutôt que `-base64`, ou URL-encoder
explicitement si `-base64` est requis pour une autre raison.

**Chaque service d'un `docker-compose.yml` a besoin de ses propres
overrides d'environnement — les poser sur un seul service (ex. `api`) ne se
propage pas aux autres qui partagent pourtant le même `.env` (`env_file:`)
et le même besoin (ex. `MEILI_URL: http://meilisearch:7700`, oublié sur
`worker` alors que présent sur `api`, provoquant un crash-loop
`ECONNREFUSED ::1:7700` — le défaut dev `localhost:7700` du code prenait le
dessus).** Revérifier tous les services qui partagent une dépendance
réseau (Postgres/Redis/Meilisearch/Object Storage), pas seulement celui
testé en premier.

**La CSP `script-src 'self'` (sans `'unsafe-inline'` ni nonce) casse toute
page Next.js App Router : page blanche.** Next.js injecte un `<script>`
inline par page pour le payload de streaming/hydratation RSC (pas un fichier
externe) — bloqué par une CSP stricte, la console affiche `Executing inline
script violates ... script-src 'self'` mais **rien à l'écran**, aucune
erreur réseau visible (le HTML initial est bien servi, seule l'hydratation
React échoue). La CSP du Caddyfile prod avait été écrite et sa *syntaxe*
validée (`caddy validate`) en Phase 5, mais jamais vérifiée en conditions
réelles (l'app n'avait jamais tourné derrière Caddy avant la bascule Phase 6)
— exactement le type de vérification que ce dépôt exige (§5 CLAUDE.md) et qui
aurait attrapé ça avant la mise en ligne. Corrigé avec `script-src 'self'
'unsafe-inline'` (affaiblit la protection contre l'injection de script — une
CSP à base de nonce par requête, générée par un middleware Next.js plutôt
qu'un en-tête statique Caddy, serait la correction propre, non faite ici).
**Règle générale : toute CSP `script-src` doit être testée contre un vrai
rendu de page de l'app, pas seulement validée syntaxiquement.**

**`PHOTON_URL` doit inclure le suffixe `/api`** — `apps/api/src/routes/geocode.ts`
fait `${env.PHOTON_URL}?q=...` sans ajouter de chemin lui-même ; le défaut du
schéma (`https://photon.komoot.io/api`) inclut déjà `/api`, ce qui masque
facilement l'oubli quand on pointe `PHOTON_URL` vers l'instance privée
(`http://192.168.120.209:2322` sans suffixe → `GET /geocode` répond `502
geocoding_upstream_error`, alors qu'un `curl` direct du même conteneur vers
`.../2322/api?q=...` fonctionne — la réachabilité réseau n'est pas en cause,
seulement le chemin). Voir `infra/README.md`.

**Un bind mount Docker `./fichier:/chemin:ro` pointe sur l'inode au moment de
la création du conteneur, pas sur le chemin.** `docker compose exec caddy
caddy reload --config /etc/caddy/Caddyfile` après un `git pull` qui a modifié
`infra/caddy/Caddyfile` sur l'hôte a rechargé... l'**ancien** contenu (log
Caddy : `"msg":"config is unchanged"`) — `git pull`/`checkout` remplace le
fichier par un rename atomique (nouvel inode), que le bind mount déjà établi
ne suit pas. `docker compose exec caddy grep ... /etc/caddy/Caddyfile` dans
le conteneur confirmait l'ancien contenu alors que `grep` sur l'hôte montrait
le nouveau. Corrigé avec `docker compose up -d --force-recreate caddy`
(recrée le conteneur, ré-établit le bind mount) plutôt qu'un simple
`caddy reload` — **règle générale : après tout changement du Caddyfile sur
l'hôte via git, recréer le conteneur `caddy`, ne pas se fier à `reload` seul.**
Bug réel trouvé et corrigé en prod le 2026-08-20 (voir plan/TASKS.md, fix CORS
upload + CSP `media-src blob:`).

**CSP `media-src` doit inclure `blob:` dès qu'un écran prévisualise un
fichier local via `URL.createObjectURL` avant upload.** Le flux Ajouter
(`apps/web/app/ajouter/StepDetails.tsx`, `local-probe.ts`) génère une URL
`blob:` locale lue par le `<audio>` partagé pour prévisualiser le son choisi
avant tout envoi au serveur — jamais testé en navigateur réel contre la CSP
de prod avant cette session (même catégorie d'oubli que `script-src`
ci-dessus : CSP validée syntaxiquement, jamais contre un vrai parcours
utilisateur). Erreur silencieuse côté navigateur : `Refused to load blob:...
because it does not appear in the media-src directive`, pas d'erreur serveur.

**La passerelle S3-compat Infomaniak ne répond pas correctement aux
préflights CORS (`OPTIONS` → `405`) sur un `PUT` pré-signé envoyé
directement par le navigateur depuis une origine différente.** Casse tout
upload en prod (fonctionnait en dev contre MinIO, qui répond correctement
aux préflights) — la même limitation CORS d'Infomaniak avait déjà été
rencontrée en Phase 5 pour le bucket de tuiles en lecture (`PutBucketCors`
en `501`), mais pas encore pour un upload direct navigateur. Pas de
contournement Infomaniak trouvé côté configuration du bucket ; corrigé en
appliquant la même stratégie que pour `/tiles/*` : proxy Caddy same-origin
(`handle_path /storage-upload/*` → `s3.pub1.infomaniak.cloud` avec
`header_up Host` réécrit pour matcher la signature SigV4), activé via
`OBJECT_STORAGE_UPLOAD_PROXY_URL` (voir `apps/api/src/routes/uploads.ts`) —
**règle générale : ne pas retenter la config CORS native Infomaniak pour un
nouveau usage, aller directement au proxy same-origin Caddy, seule
approche qui a fonctionné jusqu'ici sur cet hébergeur.**

## Infra / environnement d'exécution local

**Plusieurs worktrees du même repo qui lancent chacun leur `docker-compose.yml`
peuvent se marcher dessus.** Scoping de projet Docker Compose attendu par nom
de dossier (`COMPOSE_PROJECT_NAME` dérivé du basename) — mais `docker compose
rm -f <services>` lancé depuis un worktree a fait disparaître les conteneurs
d'un **autre** worktree (Postgres/Redis/Meilisearch actifs depuis 35 min,
cause exacte non investiguée). Avant de lancer `docker compose down`/`rm` en
session, vérifier `docker ps -a` pour repérer d'éventuels conteneurs d'un
autre worktree du même repo, et prévenir l'utilisateur si une suppression
pourrait les toucher — ne pas assumer que le scoping par projet protège
totalement en environnement multi-worktree.

**Le dépôt vit dans iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`)
— un reboot de la machine peut laisser `fileproviderd` saturer l'I/O pendant
un temps long (observé : 70-150% CPU en continu plus d'une heure), rendant
`node_modules` intermittemment illisible.** Symptôme concret rencontré :
`npx tsx src/index.ts` plantait avec `TypeError: r.register is not a
function` — un fichier `.cjs` de `tsx` lu vide/tronqué (fichier "stub" iCloud
pas encore rematérialisé, pas une corruption réelle : `cat`/`wc -c` sur le
même fichier redevenaient normaux après un délai). Pendant l'épisode, même
`tsc --noEmit`/`eslint`/`grep -r` simples prenaient plusieurs dizaines de
minutes au lieu de secondes — pas un bug de ce dépôt, l'I/O lui-même était le
goulot. Passer le dossier en "toujours garder sur ce Mac" (désactiver
l'optimisation de stockage iCloud) réduit le phénomène mais son rapatriement
initial complet peut lui-même prendre du temps sur un gros `node_modules`
multi-workspaces. À surveiller après tout reboot sur cette machine ; si des
commandes triviales (`grep`, `cat`) traînent anormalement, c'est le signal —
attendre plutôt que de conclure à un bug de code.

**`Bash` refuse les commandes contenant un secret en clair sur la ligne**
(ex. `aws ... --secret-key XXXX`), même légitimes. Passer par un fichier de
credentials local (ex. `AWS_SHARED_CREDENTIALS_FILE`) plutôt que d'inliner la
valeur, ou appeler le SDK directement depuis un script Node plutôt qu'un CLI.

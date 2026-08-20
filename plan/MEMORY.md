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

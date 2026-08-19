# Mémoire — pièges déjà rencontrés

Contrairement au [journal de session](TASKS.md#journal-de-session) (chronologique,
« qu'est-ce qui a été fait quand »), ce fichier est organisé par thème : **avant
de retoucher une zone du code listée ici, relire l'entrée correspondante**. Le
but est de ne pas re-découvrir deux fois le même piège.

Chaque entrée : le piège, pourquoi il s'est produit, la règle à appliquer.

---

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

## Object Storage (S3-compatible)

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

**`Bash` refuse les commandes contenant un secret en clair sur la ligne**
(ex. `aws ... --secret-key XXXX`), même légitimes. Passer par un fichier de
credentials local (ex. `AWS_SHARED_CREDENTIALS_FILE`) plutôt que d'inliner la
valeur, ou appeler le SDK directement depuis un script Node plutôt qu'un CLI.

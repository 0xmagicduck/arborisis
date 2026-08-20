# Déploiement — `arborisis-app-1`

Phase 6 (voir [plan/TASKS.md](../plan/TASKS.md) et [plan/11-roadmap.md](../plan/11-roadmap.md)).
Jusqu'à cette phase, seul Caddy tournait sur la VM, servant le hello-world de
la Phase 0 (voir [plan/04-infra-infomaniak.md](../plan/04-infra-infomaniak.md)).

## Vue d'ensemble

Le dépôt entier est cloné à la racine de `/opt/arborisis` sur la VM (pas
seulement `infra/`) — le [Dockerfile](docker/Dockerfile) construit
l'application depuis la racine du monorepo pnpm/Turborepo. `docker-compose.yml`
est ensuite lancé depuis `/opt/arborisis/infra`.

Services : `caddy` (déjà en place depuis la Phase 0), `postgres` (PostGIS),
`redis`, `meilisearch`, `api`, `worker`, `web`. Un service `migrate` à
profil `tools` exécute les migrations Drizzle ponctuellement, sans tourner en
continu.

**Caddy sert toujours le hello-world tant que le bloc production n'est pas
activé dans `caddy/Caddyfile`** — voir §3 ci-dessous. C'est une bascule
volontaire, décidée explicitement une fois le reste vérifié en interne, pas
un effet de bord du déploiement des autres services.

## 1. Variables d'environnement requises (`/opt/arborisis/.env`)

Le fichier `.env` du serveur ne contient aujourd'hui que `ARBORISIS_DOMAIN`
(posé en Phase 0). À compléter avant `docker compose up`, dans le même
fichier — voir [.env.example](../.env.example) à la racine du repo pour le
détail de chaque variable (ce fichier documente les valeurs *de dev* ; les
notes ci-dessous donnent l'équivalent prod) :

| Variable | Valeur prod | Source |
|---|---|---|
| `ARBORISIS_DOMAIN` | `arborisis.com` | déjà posée (Phase 0) |
| `POSTGRES_PASSWORD` | secret généré | `openssl rand -base64 24` |
| `MEILI_MASTER_KEY` | secret généré | `openssl rand -base64 24` |
| `NODE_ENV` | `production` | fixe |
| `WEBAUTHN_RP_ID` | `arborisis.com` | fixe |
| `WEBAUTHN_RP_NAME` | `Arborisis` | fixe |
| `WEBAUTHN_ORIGIN` | `https://arborisis.com` | fixe |
| `ARCHIVE_TO_IA` | `false` | mode intérimaire, voir plan/05 §5.10 |
| `NEXT_PUBLIC_API_URL` | `/api` | same-origin via le proxy Caddy §3 — voir la note dans `caddy/Caddyfile` |
| `NEXT_PUBLIC_PMTILES_URL` | `/tiles/luxembourg.pmtiles` | inchangé dev→prod, voir `.env.example` |
| `MEILI_URL` | `http://meilisearch:7700` | posée directement par `docker-compose.yml`, ne pas dupliquer dans `.env` |
| `OBJECT_STORAGE_ENDPOINT` | `https://s3.pub1.infomaniak.cloud` (à confirmer selon la région du container) | Object Storage Infomaniak déjà provisionné (Phase 2) |
| `OBJECT_STORAGE_REGION` | `us-east-1` | **pas** la région OpenStack réelle — voir `.env.example` |
| `OBJECT_STORAGE_BUCKET` | `arborisis-storage` | déjà provisionné (Phase 0) |
| `OBJECT_STORAGE_ACCESS_KEY_ID` / `OBJECT_STORAGE_SECRET_ACCESS_KEY` | credentials EC2 réelles du bucket | **à générer** (`openstack ec2 credentials create`, voir plan/04 §4.1) — pas encore fait pour cette VM au moment de la rédaction |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | `true` | fixe |
| `MAX_UPLOAD_BYTES` | `524288000` | fixe |
| `PHOTON_URL` | `http://192.168.120.209:2322` | instance auto-hébergée Phase 5, réseau privé — voir `infra/photon/README.md` |
| `ADMIN_HANDLES` | handle(s) réel(s) séparés par des virgules | à choisir |
| `BACKUP_GPG_PASSPHRASE` | passphrase existante | générée en Phase 5, voir `infra/backup/README.md` — **ne pas en générer une nouvelle**, elle rendrait les sauvegardes déjà déposées irrécupérables |

`PORT`/`REDIS_URL`/`DATABASE_URL` ne sont **pas** à poser dans `.env` : posées
directement par `docker-compose.yml` (résolution par nom de service Docker).

## 2. Déploiement

```bash
ssh ubuntu@195.15.247.170
cd /opt/arborisis
# Première fois : cloner le repo entier à la racine (pas seulement infra/) —
# actuellement seuls caddy/, hello-world/, docker-compose.yml, .env y vivent
# (dépôt Phase 0). Un `git init` + `git remote add` + `git fetch`/`checkout`
# en place, ou un clone dans un dossier temporaire suivi d'un déplacement,
# selon ce qui est déjà présent au moment de l'exécution.
git pull   # ou git clone, voir ci-dessus

cd infra
docker compose build
docker compose up -d postgres redis meilisearch
docker compose --profile tools run --rm migrate
docker compose up -d api worker web
```

## 3. Vérification interne (avant toute exposition publique)

Ne pas publier de port `api`/`web` sur l'hôte à ce stade — vérifier depuis
l'intérieur des conteneurs, sur le réseau Docker interne :

```bash
docker compose exec api wget -qO- http://localhost:4000/health
docker compose exec web wget -qO- http://localhost:3000
docker compose logs worker --tail 50
```

Un cycle d'inscription/upload réel (même méthode que les vérifications
Phase 1-5, voir CLAUDE.md §5) doit être rejoué contre cette stack avant la
bascule — pas seulement un `curl` de santé.

## 4. Bascule Caddy (action outward-facing, décidée explicitement)

Une fois tout vérifié : dans `caddy/Caddyfile`, commenter le bloc hello-world
et décommenter le bloc production (déjà écrit et sa syntaxe déjà validée,
voir le commentaire dans le fichier), puis :

```bash
docker compose restart caddy
```

Le DNS `arborisis.com` pointe déjà vers cette VM depuis la Phase 0 — cette
étape *est* la bascule de la Phase 6, pas une étape DNS séparée.

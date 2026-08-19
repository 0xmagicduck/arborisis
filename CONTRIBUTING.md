# Contribuer à Arborisis

Merci de l'intérêt porté à ce projet ! Arborisis est open source dès le premier commit — voir [plan/01-vision-et-principes.md](plan/01-vision-et-principes.md) pour l'esprit du projet et [plan/11-roadmap.md](plan/11-roadmap.md) / [plan/TASKS.md](plan/TASKS.md) pour l'état d'avancement.

> Le projet est en Phase 1 (socle technique) de la roadmap. Les écrans produit (Explorer, Découvrir…) arrivent en Phase 3 — voir [plan/TASKS.md](plan/TASKS.md).

## Lancer le projet en local

Aucun compte Internet Archive nécessaire en développement : l'intégration IA est reportée après le lancement (voir [plan/05-stockage-audio-internet-archive.md §5.10](plan/05-stockage-audio-internet-archive.md#510-mode-intérimaire--repli-sur-object-storage-infomaniak-pas-dinternet-archive-au-démarrage)), tout le stockage audio repose sur l'Object Storage Infomaniak (ou un stub local en Phase 2).

Prérequis :
- Node.js 20 LTS
- pnpm (`corepack enable` suffit, la version est épinglée dans `package.json`)
- Docker + Docker Compose (pour PostgreSQL/PostGIS, Redis, Meilisearch)

```bash
cp .env.example .env
docker compose up -d          # postgres, redis, meilisearch — voir docker-compose.yml
pnpm install
pnpm db:generate               # génère les migrations Drizzle si le schéma a changé
pnpm db:migrate                # applique le schéma (packages/db)
pnpm dev                       # web (:3000), api (:4000), worker — via Turborepo
```

`pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` tournent sur tout le monorepo (voir `turbo.json`), c'est ce que la CI exécute (`.github/workflows/ci.yml`).

## Organisation du code

```
arborisis/
├── apps/            # web (Next.js), api (Fastify), worker (BullMQ)
├── packages/        # design-tokens, shared-types, db (Drizzle)
├── infra/           # docker-compose.yml, caddy/, terraform/
├── plan/            # documentation d'architecture et de decision
└── design/          # système de design (handoff, explorations)
```

Détails : [plan/03-stack-technique.md](plan/03-stack-technique.md).

## Convention de commits

Commits impératifs, courts, en français ou anglais selon la langue déjà utilisée dans le fichier modifié. Une PR = un sujet cohérent.

## Processus de review

- Toute contribution passe par une Pull Request vers `main`.
- `main` est protégée : review obligatoire + CI verte avant merge.
- Les issues étiquetées `good first issue` sont un bon point d'entrée pour les nouveaux contributeurs.

## Licence

En contribuant, vous acceptez que votre code soit distribué sous licence **AGPL-3.0** (voir [LICENSE](LICENSE)). La documentation (`plan/`, `design/`) est sous **CC-BY-SA 4.0**.

## Code de conduite

Ce projet suit le [Code de conduite des contributeurs](CODE_OF_CONDUCT.md).

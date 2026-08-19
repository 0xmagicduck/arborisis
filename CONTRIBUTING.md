# Contribuer à Arborisis

Merci de l'intérêt porté à ce projet ! Arborisis est open source dès le premier commit — voir [plan/01-vision-et-principes.md](plan/01-vision-et-principes.md) pour l'esprit du projet et [plan/11-roadmap.md](plan/11-roadmap.md) / [plan/TASKS.md](plan/TASKS.md) pour l'état d'avancement.

> Le projet est encore en phase de bootstrap (Phase 0 de la roadmap). L'architecture ci-dessous décrit la cible ; certaines parties ne sont pas encore scaffoldées.

## Lancer le projet en local

*(à compléter au fur et à mesure du scaffold — Phase 1 de la roadmap)*

Objectif visé : `docker compose up` avec des services mockés/légers pour ne pas dépendre d'un vrai compte Internet Archive en développement (voir [plan/09-open-source-devops.md §9.5](plan/09-open-source-devops.md#95-gouvernance-de-contribution)).

Prérequis prévus :
- Node.js 20 LTS
- pnpm
- Docker + Docker Compose

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

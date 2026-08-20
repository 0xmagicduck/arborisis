# Dockerfile multi-cible pour le monorepo pnpm/Turborepo — Phase 6, voir
# plan/TASKS.md et plan/11-roadmap.md ("Bascule DNS finale").
#
# Un seul Dockerfile, trois images finales (--target api|worker|web) : la
# monorepo entier est copié et construit une fois dans le stage `build`
# (workspaces pnpm interdépendants — @arborisis/db, @arborisis/storage, etc.
# — ne se construisent pas isolément par app), puis chaque image finale ne
# redémarre pas l'install/le build, juste `node dist/index.js` ou `next start`.
#
# Simplification assumée : chaque image finale copie l'intégralité de
# /repo (avec node_modules complet, y compris devDependencies) plutôt qu'un
# `pnpm deploy --prod` par paquet — plus simple à faire fonctionner du premier
# coup pour un monorepo à interdépendances internes, au prix d'images plus
# grosses que nécessaire (les 74 Go de disque libre sur arborisis-app-1 le
# permettent largement). À optimiser plus tard si la taille d'image devient un
# problème réel (voir plan/TASKS.md).

FROM node:20-alpine AS base
# libc6-compat : requis par certains modules natifs (ex. sharp, transitif via
# Next.js) sur l'image Alpine musl.
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# NEXT_PUBLIC_* sont inlinées par `next build` dans le bundle client au
# moment de la build, PAS lues au runtime du conteneur — les poser seulement
# dans le `.env` du service `web` (env_file, runtime) n'a aucun effet sur le
# JS déjà généré. D'où ces ARG/ENV ici plutôt que dans le stage `web`
# ci-dessous (bug réel rencontré au premier déploiement Phase 6 : le bundle
# appelait encore http://localhost:4000, valeur par défaut du code, voir
# apps/web/lib/api.ts). Défauts = mêmes valeurs que .env.example, pour ne pas
# casser un `docker build` sans --build-arg (dev/CI).
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_PMTILES_URL=/tiles/luxembourg.pmtiles
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_PMTILES_URL=${NEXT_PUBLIC_PMTILES_URL}
RUN pnpm build

# --- apps/api ---
FROM base AS api
RUN apk add --no-cache tini
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]

# --- apps/worker : ffmpeg/ffprobe système requis, voir plan/05 §5.3 ---
FROM base AS worker
RUN apk add --no-cache ffmpeg tini
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/worker
ENV NODE_ENV=production
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]

# --- apps/backup : pg_dump (client 16, doit matcher la version du serveur —
# piège documenté dans plan/MEMORY.md, un client plus récent émet des
# directives que Postgres 16 ne reconnaît pas) + gpg, voir infra/backup/README.md.
# Pas de build tsc : le script tourne via `tsx` directement (mêmes
# devDependencies présentes dans /repo que pour les autres cibles).
FROM base AS backup
RUN apk add --no-cache postgresql16-client gnupg tini
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/backup
ENV NODE_ENV=production
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "backup"]

# --- apps/web ---
FROM base AS web
RUN apk add --no-cache tini
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/web
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]

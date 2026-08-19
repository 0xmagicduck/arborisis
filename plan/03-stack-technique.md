# 3. Stack technique

## 3.1 Choix par couche

| Couche | Choix | Pourquoi | Alternative écartée |
|---|---|---|---|
| Frontend | **Next.js 14+ (App Router) + TypeScript + React** | SSR pour perf/SEO initiale, écosystème carto (MapLibre, react-map-gl) très riche, grande base de contributeurs potentiels pour un projet open source | SvelteKit (plus léger, mais bassin de contributeurs plus petit — pertinent si tu préfères une stack plus minimaliste, à trancher) |
| Style | **CSS Modules + variables CSS** reprenant directement les tokens du [handoff design](../design/handoff/DEV-HANDOFF.md#1-design-tokens) | Le design system est déjà piloté par tokens CSS et volontairement minimal ; Tailwind ajouterait une couche d'abstraction pour peu de bénéfice sur un système à si peu de composants | Tailwind CSS (viable si tu veux une convention plus outillée — mentionné dans le handoff comme option libre) |
| Carte | **MapLibre GL JS** (fork open source de Mapbox GL JS, licence BSD) | Aucune clé API, aucune télémétrie propriétaire, API quasi identique à Mapbox donc doc/exemples réutilisables | Mapbox GL JS (payant au-delà d'un seuil, token obligatoire), Leaflet (raster-only, moins adapté au style vectoriel épuré recherché) |
| Tuiles carte | **PMTiles auto-hébergées** (voir [07-carte-open-source.md](07-carte-open-source.md)) | Zéro serveur de tuiles à maintenir, zéro coût, lecture directe depuis Object Storage | Serveur de tuiles dédié (tileserver-gl) — plus d'opérations pour un bénéfice nul au MVP |
| Backend API | **Node.js 20 LTS + TypeScript + Fastify** | Un seul langage front/back, types partagés via un package monorepo, Fastify est léger et rapide | NestJS (plus structurant mais plus lourd), Python/FastAPI (pertinent si le traitement audio dominait, mais ffmpeg s'invoque en CLI depuis n'importe quel langage) |
| Validation | **Zod** | Schémas partageables entre client et serveur, types TypeScript dérivés automatiquement | — |
| ORM / accès DB | **Drizzle ORM** | SQL-first, bon support des types PostGIS/géométrie via requêtes brutes typées, plus léger que Prisma sur ce point précis | Prisma (excellent DX mais support PostGIS plus limité — nécessiterait du SQL brut de toute façon) |
| Base de données | **PostgreSQL 16 + extension PostGIS** | Standard de facto pour les données géospatiales, aucune dépendance propriétaire, requêtes de proximité/bounding-box natives | MongoDB + geo-index (moins adapté à des relations utilisateurs/tags/licences) |
| Recherche texte | **Meilisearch** (auto-hébergé) | Léger, tolérant aux fautes de frappe, facettes simples à configurer (lieu, tag, durée), bien plus simple à opérer qu'Elasticsearch | Elasticsearch/OpenSearch (surdimensionné pour l'échelle visée) |
| File de tâches | **Redis + BullMQ** | Standard Node.js pour jobs asynchrones (transcodage, push Internet Archive), retries avec backoff intégrés | — |
| Traitement audio | **ffmpeg** (transcodage, validation) + génération de peaks (waveform) via `audiowaveform` (BBC, open source) ou calcul RMS maison | Outils matures, open source, invocables en CLI depuis le worker Node | Bibliothèques audio Python (librosa) — pas nécessaire, ffmpeg suffit largement |
| Authentification | **WebAuthn** via `@simplewebauthn/server` + `@simplewebauthn/browser` | Implémentation TypeScript de référence, maintenue, couvre passkeys et clés physiques nativement | Passport.js + stratégie email/password (exactement ce qu'on veut éviter) |
| Géocodage | **Nominatim / Photon** (voir [07-carte-open-source.md](07-carte-open-source.md)) | Basé sur les données OpenStreetMap, aucune clé API | Google Places API, Mapbox Geocoding API (payants) |
| Reverse proxy / TLS | **Caddy** | Configuration minimale, HTTPS automatique via Let's Encrypt, adapté à une seule VM | Nginx + Certbot (plus de pièces mobiles pour le même résultat) |
| Conteneurisation | **Docker + Docker Compose** (MVP) | Déploiement reproductible, chemin ouvert vers Kubernetes plus tard sans changer les images | — |

## 3.2 Organisation du code (monorepo)

```
arborisis/
├── apps/
│   ├── web/          # Next.js — frontend
│   ├── api/           # Fastify — API REST/RPC
│   └── worker/         # BullMQ — traitement audio + push Internet Archive
├── packages/
│   ├── design-tokens/  # variables CSS issues du handoff design
│   ├── shared-types/    # schémas Zod + types partagés front/back
│   └── db/               # schéma Drizzle + migrations PostgreSQL/PostGIS
├── infra/
│   ├── docker-compose.yml
│   ├── caddy/
│   └── terraform/        # provisioning Infomaniak (voir 04-infra-infomaniak.md)
└── plan/                  # ce dossier
```

Outillage : **pnpm workspaces + Turborepo** pour le monorepo, **ESLint + Prettier** pour la cohérence, **Vitest** (tests unitaires) + **Playwright** (tests end-to-end, notamment le flux d'upload et l'auth WebAuthn qui se simule bien en E2E via l'API virtual authenticator de Chrome DevTools Protocol).

## 3.3 À trancher

- Next.js vs SvelteKit : dépend de ta préférence personnelle et de qui tu espères voir contribuer. Recommandation par défaut : Next.js, pour la maturité de l'écosystème MapLibre/react-map-gl.
- CSS Modules vs Tailwind : les deux sont compatibles avec le design system ; CSS Modules colle mieux à l'esprit "peu de composants, système fermé" du handoff.

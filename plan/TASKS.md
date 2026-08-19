# Suivi des tâches — Arborisis V2

Fichier de suivi vivant, à cocher au fur et à mesure. Reflète le phasage de [11-roadmap.md](11-roadmap.md).
Légende statut : `☐` à faire · `▶` en cours · `☑` fait · `⛔` bloqué (raison en note)

Dernière mise à jour : 2026-08-19 (Phase 1 close : monorepo scaffoldé, auth WebAuthn validée en conditions réelles, CI de base)

---

## Phase 0 — Bootstrap infra (avant tout code produit)

| Tâche | Statut | Note |
|---|---|---|
| Créer l'organisation GitHub, dépôt public | ☑ | Dépôt public créé sous le compte `0xmagicduck` : [github.com/0xmagicduck/arborisis](https://github.com/0xmagicduck/arborisis) (pas d'organisation GitHub séparée, dépôt personnel) |
| Licence AGPL-3.0 + `CONTRIBUTING.md`/`CODE_OF_CONDUCT.md`/`SECURITY.md` | ☑ | Fichiers créés et poussés sur le dépôt |
| Provisionner le domaine `arborisis.com` (DNS) | ☑ | Domaine déjà possédé par l'utilisateur (registrar Gandi, DNS géré chez Cloudflare). Enregistrement `A` déjà présent et pointant vers l'IP flottante Infomaniak — aucune action DNS nécessaire |
| Provisionner la VM Infomaniak Public Cloud + Object Storage via Terraform | ☑ | `terraform apply` exécuté sur `dc3-a` : VM `arborisis-app-1` (4vCPU/8Go/80Go, ~16,84€/mois), IP flottante `195.15.247.170`, réseau/secgroup dédiés, container Object Storage `arborisis-storage` (privé) |
| Caddy fonctionnel avec HTTPS auto sur une page "hello world" | ☑ | **Validé en production** : [https://arborisis.com](https://arborisis.com) répond en HTTP/2 200 avec certificat Let's Encrypt valide |
| Demander la création de la collection Internet Archive dédiée | ⛔ | **Bloqué** : Internet Archive n'examine une demande de collection dédiée qu'après ≈50 items déjà publiés par le compte — seuil inatteignable avant lancement. Reporté, voir [05.10](05-stockage-audio-internet-archive.md#510-mode-intérimaire--repli-sur-object-storage-infomaniak-pas-dinternet-archive-au-démarrage). Pas d'action possible tant qu'Arborisis n'a pas d'utilisateurs réels. |
| Créer les comptes/clés nécessaires (Internet Archive IAS3, Object Storage Infomaniak) | ▶ | Identifiants OpenStack Infomaniak configurés en local (`~/.config/openstack/clouds.yaml`), non commités, VM provisionnée avec succès. IAS3 (Internet Archive) **volontairement non créé pour l'instant** — voir mode intérimaire ci-dessus ; tout repose sur l'Object Storage Infomaniak déjà provisionné. |

## Phase 1 — Socle technique

| Tâche | Statut | Note |
|---|---|---|
| Scaffold monorepo (pnpm + Turborepo), packages `shared-types`, `db`, `design-tokens` | ☑ | `apps/{web,api,worker}` + `packages/{shared-types,db,design-tokens}`. Vérifié réellement : `pnpm install`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` passent tous sur les 6 packages (pas seulement écrit — exécuté) |
| Schéma PostgreSQL/PostGIS + migrations (Drizzle) | ☑ | Schéma dans [packages/db/src/schema.ts](../packages/db/src/schema.ts) (users, webauthn_credentials, recovery_codes, recordings + index GIST). Migration **appliquée avec succès** sur un Postgres/PostGIS réel via `docker compose up` + `pnpm db:migrate` — deux bugs réels trouvés et corrigés à cette occasion (voir journal) : chemin de migration cassé par un espace dans le nom de dossier, et `drizzle-kit generate` qui quote à tort le type `geography(Point,4326)` (absent de sa liste de types natifs) |
| Authentification WebAuthn de bout en bout | ☑ | Code complet : `apps/api/src/routes/auth.ts` (register/login start+finish, sessions Redis révocables, codes de récupération, rate limiting) + `apps/web/app/{register,login}` (`@simplewebauthn/browser`). **Cérémonie complète testée en conditions réelles** dans le navigateur (inscription → 10 codes de récupération affichés → déconnexion implicite → connexion → session persistée, vérifié via `/auth/me` et directement en base) contre Postgres/Redis vivants. Un bug réel corrigé au passage : `setErrorHandler` posé après l'enregistrement des routes ne s'appliquait pas (encapsulation Fastify) et laissait fuiter les erreurs Zod brutes en 500 au lieu d'un 400 propre |
| CI de base (lint, typecheck, tests) | ☑ | [.github/workflows/ci.yml](../.github/workflows/ci.yml) — mêmes commandes que celles vérifiées en local ci-dessus, plus Postgres/Redis en services GitHub Actions |

## Phase 2 — Pipeline d'upload et archivage

| Tâche | Statut | Note |
|---|---|---|
| Upload direct vers Object Storage (URL pré-signées) | ☐ | |
| Worker : validation ffprobe, transcodage ffmpeg, waveform peaks | ☐ | |
| Intégration Internet Archive (push IAS3, polling, retry) | ⛔ | Reportée après lancement (seuil ≈50 items), voir [05.10](05-stockage-audio-internet-archive.md#510-mode-intérimaire--repli-sur-object-storage-infomaniak-pas-dinternet-archive-au-démarrage). Le worker garde la structure du job, étape IA en no-op derrière `ARCHIVE_TO_IA=false`. |
| État `processing` visible côté utilisateur | ☐ | |

## Phase 3 — Écrans du MVP (frontend)

| Tâche | Statut | Note |
|---|---|---|
| Explorer | ☐ | Fidèle à `design/system/Explorer.dc.html` |
| Découvrir | ☐ | `design/system/Discover.dc.html` |
| Recording Detail | ☐ | `design/system/RecordingDetail.dc.html` |
| Ajouter (3 étapes) | ☐ | `design/system/Upload1-3.dc.html` |
| Profil | ☐ | `design/system/Profile.dc.html` |
| Recherche | ☐ | `design/system/Search.dc.html` |
| Déclinaisons mobile de chaque écran | ☐ | `design/system/Mobile*.dc.html` |

## Phase 4 — Carte et recherche

| Tâche | Statut | Note |
|---|---|---|
| Premier fichier `.pmtiles` (Planetiler) | ☐ | |
| Intégration MapLibre + style "Quiet Cartography" | ☐ | |
| Clustering client (Supercluster), requêtes viewport PostGIS | ☐ | |
| Géocodage (Photon, bootstrap → auto-hébergé) | ☐ | |
| Indexation Meilisearch + écran Recherche | ☐ | |

## Phase 5 — Durcissement avant lancement

| Tâche | Statut | Note |
|---|---|---|
| Audit accessibilité complet (WCAG AA) | ☐ | |
| Politique de modération minimale (signalement) | ☐ | |
| Sauvegardes automatisées + test de restauration | ☐ | |
| Politique de confidentialité, CGU, mentions légales (RGPD/nLPD) | ☐ | |
| Revue de sécurité (dépendances, headers HTTP, rate limiting auth) | ☐ | |
| Auto-hébergement définitif tuiles + géocodage | ☐ | |

## Phase 6 — Lancement public

| Tâche | Statut | Note |
|---|---|---|
| Bascule DNS finale sur `arborisis.com` | ☐ | |
| Annonce du dépôt GitHub ouvert aux contributions | ☐ | |
| Surveillance queue Internet Archive (premières semaines) | ☐ | |

---

## Décisions en attente (bloquent une action concrète)

- **Collection Internet Archive dédiée** : ⛔ bloquée structurellement, pas juste "lente" — IA exige ≈50 items déjà publiés avant d'examiner une demande de collection dédiée, voir [05.5](05-stockage-audio-internet-archive.md#55-licence--condition-dhébergement-pas-juste-une-option-ui). Rien à démarrer ici avant d'avoir des utilisateurs réels.
- **Compte IAS3** (Internet Archive) : reporté, plus nécessaire pour la Phase 2 — voir mode intérimaire [05.10](05-stockage-audio-internet-archive.md#510-mode-intérimaire--repli-sur-object-storage-infomaniak-pas-dinternet-archive-au-démarrage).
- **Reverse-proxy/CDN externe devant Caddy** (ex. Cloudflare) : le DNS `arborisis.com` est déjà chez Cloudflare — décider si on active leur proxy (orange cloud) ou si on reste en DNS-only comme recommandé par défaut dans [04.7](04-infra-infomaniak.md#47-à-trancher). Actuellement en DNS-only (le certificat Let's Encrypt de Caddy n'aurait pas pu s'émettre sinon).

## Décisions déjà tranchées cette session

- **GitHub** : dépôt public sous le compte personnel `0xmagicduck` (pas d'organisation séparée) — [github.com/0xmagicduck/arborisis](https://github.com/0xmagicduck/arborisis).
- **Domaine** : déjà possédé (registrar Gandi, DNS Cloudflare), déjà pointé vers l'IP flottante Infomaniak.
- **VM** : 4 vCPU / 8 Go RAM / 80 Go SSD, région `dc3-a`, budget cible 50-60€/mois (coût réel constaté : ~16,84€/mois pour la VM seule).

## Prochaine session

Phase 1 close et validée en conditions réelles — passer à la Phase 2 (pipeline d'upload : ffprobe/ffmpeg/waveform, `apps/worker/src/jobs/publish-recording.ts` a déjà la structure du job et le point d'extension IA en no-op).

## Journal de session

- 2026-08-19 : Mise en place du suivi de tâches, fichiers de gouvernance (LICENSE AGPL-3.0, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY), squelette Terraform Infomaniak complet (non appliqué), squelette Caddy hello-world + docker-compose. Identifiants OpenStack Infomaniak reçus (projet `PCP-RYAEXPT`, régions `dc3-a`/`dc4-a`) et rangés en local hors du repo git (`~/.config/openstack/clouds.yaml`).
- 2026-08-19 : Découverte de 9 VM `github-runner-*` actives sur `dc3-a` (self-hosted GitHub Actions runners, sans rapport avec Arborisis). Suppression confirmée par l'utilisateur et exécutée : 9 instances, 9 IP flottantes, réseau `github-runners-net` + sous-réseau + routeur, security group `github-runners-sg`, keypair `github-runners-key`. Projet cloud vérifié propre après nettoyage.
- 2026-08-19 : Phase 1 démarrée. Monorepo scaffoldé (pnpm workspaces + Turborepo) : `packages/design-tokens` (tokens CSS portés depuis le handoff design), `packages/shared-types` (schémas Zod User/Recording partagés), `packages/db` (schéma Drizzle complet — users/webauthn_credentials/recovery_codes/recordings, migration initiale générée avec l'extension PostGIS). Authentification WebAuthn de bout en bout écrite : `apps/api` (Fastify — register/login start+finish avec `@simplewebauthn/server`, sessions révocables dans Redis, codes de récupération hachés en scrypt, rate limiting) et `apps/web` (Next.js — pages `/register` et `/login` avec `@simplewebauthn/browser`). `apps/worker` (BullMQ) pose la structure du job `publish-recording` avec l'étape Internet Archive en no-op derrière `ARCHIVE_TO_IA=false` (voir mode intérimaire ci-dessus). CI GitHub Actions de base ajoutée (lint/typecheck/test/build avec Postgres+Redis en services). Vérifié réellement en local : `pnpm install`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` passent tous. Non vérifié : cérémonie WebAuthn dans un vrai navigateur (Docker/Postgres/Redis indisponibles dans cet environnement d'exécution) — à faire à la prochaine session avant de considérer la Phase 1 entièrement close.
- 2026-08-19 : Phase 1 validée en conditions réelles (Docker lancé par l'utilisateur en cours de session). `docker compose up -d` (Postgres/PostGIS, Redis, Meilisearch) puis `pnpm db:migrate` — deux bugs réels trouvés et corrigés au passage : (1) `packages/db/src/migrate.ts` utilisait `new URL(...).pathname`, qui laisse les espaces du chemin encodés en `%20` et casse la résolution du dossier de migrations sur ce Mac (chemin contenant "Arborisis V2") — corrigé avec `fileURLToPath` ; (2) `drizzle-kit generate` quote à tort le type `geography(Point, 4326)` (sa liste de types PostgreSQL natifs contient "geometry" mais pas "geography") produisant un SQL invalide — corrigé à la main dans la migration générée, piège documenté dans `packages/db/src/columns.ts` pour toute regénération future. Schéma confirmé conforme en base (`\d recordings`, `postgis_version()`). API démarrée contre Postgres/Redis réels : `/health` OK, puis cérémonie WebAuthn complète testée dans un vrai navigateur — inscription (pseudo → passkey → 10 codes de récupération affichés, utilisateur + credential + codes confirmés en base), connexion (session émise, `/auth/me` renvoie l'utilisateur authentifié). Un bug réel trouvé et corrigé pendant ce test : `app.setErrorHandler` enregistré *après* les plugins de routes ne s'appliquait pas aux routes déjà encapsulées par Fastify — une entrée invalide (ex. pseudo trop court) remontait en 500 brut avec le détail Zod complet exposé au client au lieu d'un 400 propre ; corrigé en déplaçant l'enregistrement du handler avant les routes. `pnpm build/typecheck/lint/test` revérifiés verts sur les 6 packages après ces correctifs. **Phase 1 considérée close.**
- 2026-08-19 : Blocage identifié sur Internet Archive — création d'une collection dédiée impossible sans ≈50 items déjà publiés, seuil inatteignable avant lancement. Décision : reporter toute l'intégration IA après le lancement, faire reposer tout le stockage audio (original + proxy) sur l'Object Storage Infomaniak déjà provisionné pendant cette période (mode intérimaire documenté en [05.10](05-stockage-audio-internet-archive.md#510-mode-intérimaire--repli-sur-object-storage-infomaniak-pas-dinternet-archive-au-démarrage), flag `ARCHIVE_TO_IA=false`, sans impact sur le schéma de données ni l'API — juste un no-op réversible). Démarrage de la Phase 1 (socle technique).
- 2026-08-19 : Dépôt GitHub créé et poussé ([0xmagicduck/arborisis](https://github.com/0xmagicduck/arborisis)). `terraform apply` exécuté sur `dc3-a` — VM `arborisis-app-1`, IP flottante `195.15.247.170`, réseau/secgroup dédiés, container Object Storage `arborisis-storage`. Bug rencontré : l'association de l'IP flottante se perdait juste après le premier boot (attribut `network[0].port` instable côté provider OpenStack) — corrigé en réassociant en CLI puis en remplaçant la référence par un data source `openstack_networking_port_v2` (lookup par `device_id`, pas de recréation de la VM). Caddy déployé via SSH/docker compose ; DNS Cloudflare déjà aligné sur la nouvelle IP flottante (coïncidence de récupération de la même adresse par Infomaniak) — certificat Let's Encrypt émis automatiquement. **Chaîne domaine→DNS→VM→TLS validée** : https://arborisis.com répond HTTP/2 200.

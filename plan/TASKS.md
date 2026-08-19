# Suivi des tâches — Arborisis V2

Fichier de suivi vivant, à cocher au fur et à mesure. Reflète le phasage de [11-roadmap.md](11-roadmap.md).
Légende statut : `☐` à faire · `▶` en cours · `☑` fait · `⛔` bloqué (raison en note)

Dernière mise à jour : 2026-08-19

---

## Phase 0 — Bootstrap infra (avant tout code produit)

| Tâche | Statut | Note |
|---|---|---|
| Créer l'organisation GitHub, dépôt public | ☑ | Dépôt public créé sous le compte `0xmagicduck` : [github.com/0xmagicduck/arborisis](https://github.com/0xmagicduck/arborisis) (pas d'organisation GitHub séparée, dépôt personnel) |
| Licence AGPL-3.0 + `CONTRIBUTING.md`/`CODE_OF_CONDUCT.md`/`SECURITY.md` | ☑ | Fichiers créés et poussés sur le dépôt |
| Provisionner le domaine `arborisis.com` (DNS) | ☑ | Domaine déjà possédé par l'utilisateur (registrar Gandi, DNS géré chez Cloudflare). Enregistrement `A` déjà présent et pointant vers l'IP flottante Infomaniak — aucune action DNS nécessaire |
| Provisionner la VM Infomaniak Public Cloud + Object Storage via Terraform | ☑ | `terraform apply` exécuté sur `dc3-a` : VM `arborisis-app-1` (4vCPU/8Go/80Go, ~16,84€/mois), IP flottante `195.15.247.170`, réseau/secgroup dédiés, container Object Storage `arborisis-storage` (privé) |
| Caddy fonctionnel avec HTTPS auto sur une page "hello world" | ☑ | **Validé en production** : [https://arborisis.com](https://arborisis.com) répond en HTTP/2 200 avec certificat Let's Encrypt valide |
| Demander la création de la collection Internet Archive dédiée | ☐ | Dépendance externe la plus lente — **à lancer dès que possible**, démarche manuelle (voir [05.5](05-stockage-audio-internet-archive.md#55-licence--condition-dhébergement-pas-juste-une-option-ui)) |
| Créer les comptes/clés nécessaires (Internet Archive IAS3, Object Storage Infomaniak) | ▶ | Identifiants OpenStack Infomaniak configurés en local (`~/.config/openstack/clouds.yaml`), non commités, VM provisionnée avec succès. IAS3 (Internet Archive) reste à créer. |

## Phase 1 — Socle technique

| Tâche | Statut | Note |
|---|---|---|
| Scaffold monorepo (pnpm + Turborepo), packages `shared-types`, `db`, `design-tokens` | ☐ | Volontairement pas encore lancé — le roadmap précise que la chaîne domaine→DNS→VM→TLS doit être validée avant tout dev applicatif |
| Schéma PostgreSQL/PostGIS + migrations (Drizzle) | ☐ | |
| Authentification WebAuthn de bout en bout | ☐ | Fonctionnalité la plus structurante, à valider tôt une fois Phase 1 démarrée |
| CI de base (lint, typecheck, tests) | ☐ | |

## Phase 2 — Pipeline d'upload et archivage

| Tâche | Statut | Note |
|---|---|---|
| Upload direct vers Object Storage (URL pré-signées) | ☐ | |
| Worker : validation ffprobe, transcodage ffmpeg, waveform peaks | ☐ | |
| Intégration Internet Archive (push IAS3, polling, retry) | ☐ | |
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

- **Collection Internet Archive dédiée** : démarche manuelle externe à lancer — la dépendance la plus lente à obtenir, voir [05.5](05-stockage-audio-internet-archive.md#55-licence--condition-dhébergement-pas-juste-une-option-ui).
- **Compte IAS3** (Internet Archive) : à créer, nécessaire pour Phase 2 (push audio).
- **Reverse-proxy/CDN externe devant Caddy** (ex. Cloudflare) : le DNS `arborisis.com` est déjà chez Cloudflare — décider si on active leur proxy (orange cloud) ou si on reste en DNS-only comme recommandé par défaut dans [04.7](04-infra-infomaniak.md#47-à-trancher). Actuellement en DNS-only (le certificat Let's Encrypt de Caddy n'aurait pas pu s'émettre sinon).

## Décisions déjà tranchées cette session

- **GitHub** : dépôt public sous le compte personnel `0xmagicduck` (pas d'organisation séparée) — [github.com/0xmagicduck/arborisis](https://github.com/0xmagicduck/arborisis).
- **Domaine** : déjà possédé (registrar Gandi, DNS Cloudflare), déjà pointé vers l'IP flottante Infomaniak.
- **VM** : 4 vCPU / 8 Go RAM / 80 Go SSD, région `dc3-a`, budget cible 50-60€/mois (coût réel constaté : ~16,84€/mois pour la VM seule).

## Journal de session

- 2026-08-19 : Mise en place du suivi de tâches, fichiers de gouvernance (LICENSE AGPL-3.0, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY), squelette Terraform Infomaniak complet (non appliqué), squelette Caddy hello-world + docker-compose. Identifiants OpenStack Infomaniak reçus (projet `PCP-RYAEXPT`, régions `dc3-a`/`dc4-a`) et rangés en local hors du repo git (`~/.config/openstack/clouds.yaml`).
- 2026-08-19 : Découverte de 9 VM `github-runner-*` actives sur `dc3-a` (self-hosted GitHub Actions runners, sans rapport avec Arborisis). Suppression confirmée par l'utilisateur et exécutée : 9 instances, 9 IP flottantes, réseau `github-runners-net` + sous-réseau + routeur, security group `github-runners-sg`, keypair `github-runners-key`. Projet cloud vérifié propre après nettoyage.
- 2026-08-19 : Dépôt GitHub créé et poussé ([0xmagicduck/arborisis](https://github.com/0xmagicduck/arborisis)). `terraform apply` exécuté sur `dc3-a` — VM `arborisis-app-1`, IP flottante `195.15.247.170`, réseau/secgroup dédiés, container Object Storage `arborisis-storage`. Bug rencontré : l'association de l'IP flottante se perdait juste après le premier boot (attribut `network[0].port` instable côté provider OpenStack) — corrigé en réassociant en CLI puis en remplaçant la référence par un data source `openstack_networking_port_v2` (lookup par `device_id`, pas de recréation de la VM). Caddy déployé via SSH/docker compose ; DNS Cloudflare déjà aligné sur la nouvelle IP flottante (coïncidence de récupération de la même adresse par Infomaniak) — certificat Let's Encrypt émis automatiquement. **Chaîne domaine→DNS→VM→TLS validée** : https://arborisis.com répond HTTP/2 200.

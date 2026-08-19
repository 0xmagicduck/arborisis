# Suivi des tâches — Arborisis V2

Fichier de suivi vivant, à cocher au fur et à mesure. Reflète le phasage de [11-roadmap.md](11-roadmap.md).
Légende statut : `☐` à faire · `▶` en cours · `☑` fait · `⛔` bloqué (raison en note)

Dernière mise à jour : 2026-08-19

---

## Phase 0 — Bootstrap infra (avant tout code produit)

| Tâche | Statut | Note |
|---|---|---|
| Créer l'organisation GitHub, dépôt public | ☐ | En attente de confirmation (voir §Décisions en attente) |
| Licence AGPL-3.0 + `CONTRIBUTING.md`/`CODE_OF_CONDUCT.md`/`SECURITY.md` | ☑ | Fichiers créés localement à la racine du repo |
| Provisionner le domaine `arborisis.com` (DNS) | ☐ | Achat/enregistrement à faire par l'utilisateur — hors périmètre d'automatisation |
| Provisionner la VM Infomaniak Public Cloud + Object Storage via Terraform | ☐ | Squelette Terraform complet dans `infra/terraform/` (réseau, secgroup, VM 4vCPU/8Go/80Go, IP flottante, container Object Storage, cloud-init Docker), non appliqué — attend le feu vert (ressource facturée) et Terraform à installer localement |
| Caddy fonctionnel avec HTTPS auto sur une page "hello world" | ☐ | `infra/caddy/Caddyfile` + `infra/hello-world/` + `infra/docker-compose.yml` prêts, à déployer une fois la VM créée |
| Demander la création de la collection Internet Archive dédiée | ☐ | Dépendance externe la plus lente — **à lancer dès que possible**, démarche manuelle (voir [05.5](05-stockage-audio-internet-archive.md#55-licence--condition-dhébergement-pas-juste-une-option-ui)) |
| Créer les comptes/clés nécessaires (Internet Archive IAS3, Object Storage Infomaniak) | ▶ | Identifiants OpenStack Infomaniak (PCP-RYAEXPT, régions dc3-a/dc4-a) reçus et configurés en local (`~/.config/openstack/clouds.yaml`), non commités. IAS3 (Internet Archive) reste à créer. |

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

- **GitHub** : nom d'organisation (`arborisis` à vérifier de disponibilité), et quel compte utiliser pour la créer (`gh auth status` montre 3 comptes locaux : `0xmagicduck` actif, `bastienjavx`, `san2stic` — token invalide).
- **Domaine `arborisis.com`** : déjà possédé, ou à enregistrer ? L'achat est un acte financier — à faire par l'utilisateur lui-même.
- **Dimensionnement VM** : valeur de départ documentée = 4 vCPU / 8 Go RAM / 80 Go SSD, région par défaut `dc3-a` (voir [04.2](04-infra-infomaniak.md#42-ressources-nécessaires-pour-le-mvp)) — à confirmer avant `terraform apply`.
- **Budget mensuel** : non tranché dans [04.7](04-infra-infomaniak.md#47-à-trancher).

## Journal de session

- 2026-08-19 : Mise en place du suivi de tâches, fichiers de gouvernance (LICENSE AGPL-3.0, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY), squelette Terraform Infomaniak complet (non appliqué), squelette Caddy hello-world + docker-compose. Identifiants OpenStack Infomaniak reçus (projet `PCP-RYAEXPT`, régions `dc3-a`/`dc4-a`) et rangés en local hors du repo git (`~/.config/openstack/clouds.yaml`).
- 2026-08-19 : Découverte de 9 VM `github-runner-*` actives sur `dc3-a` (self-hosted GitHub Actions runners, sans rapport avec Arborisis). Suppression confirmée par l'utilisateur et exécutée : 9 instances, 9 IP flottantes, réseau `github-runners-net` + sous-réseau + routeur, security group `github-runners-sg`, keypair `github-runners-key`. Projet cloud vérifié propre après nettoyage.

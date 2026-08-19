# 11. Roadmap de développement

## Phase 0 — Bootstrap infra (avant tout code produit)

- [ ] Créer l'organisation GitHub, dépôt public, licence AGPL-3.0, `CONTRIBUTING.md`/`CODE_OF_CONDUCT.md`/`SECURITY.md`.
- [ ] Provisionner le domaine `arborisis.com` (DNS, voir [04.4](04-infra-infomaniak.md#44-domaine-arborisiscom)).
- [ ] Provisionner la VM Infomaniak Public Cloud + Object Storage via Terraform.
- [ ] Caddy fonctionnel avec HTTPS auto sur une page "hello world" — valider la chaîne domaine → DNS → VM → TLS avant tout développement applicatif.
- [ ] **Demander la création de la collection Internet Archive dédiée** (dépendance externe la plus lente à obtenir, à lancer immédiatement, voir [05.5](05-stockage-audio-internet-archive.md#55-licence--condition-dhébergement-pas-juste-une-option-ui)).
- [ ] Créer les comptes/clés nécessaires (Internet Archive IAS3, Object Storage Infomaniak).

## Phase 1 — Socle technique

- [ ] Scaffold monorepo (pnpm + Turborepo), packages `shared-types`, `db`, `design-tokens` (portage direct des tokens du handoff).
- [ ] Schéma PostgreSQL/PostGIS + migrations (Drizzle), voir [08](08-donnees-et-recherche.md).
- [ ] Authentification WebAuthn de bout en bout (inscription, connexion, codes de récupération) — voir [06](06-authentification-sans-mot-de-passe.md). C'est la fonctionnalité la plus structurante, à valider tôt.
- [ ] CI de base (lint, typecheck, tests) opérationnelle dès les premiers commits.

## Phase 2 — Pipeline d'upload et archivage

- [x] Upload direct vers Object Storage (URL pré-signées) — `POST /uploads/presign` + `POST /recordings`, voir `@arborisis/storage`.
- [x] Worker : validation ffprobe, transcodage ffmpeg, génération waveform peaks — `apps/worker/src/jobs/publish-recording.ts`.
- [ ] ~~Intégration Internet Archive (push IAS3, polling de statut, gestion d'échec/retry)~~ **reportée** : IA exige ≈50 items déjà publiés avant d'examiner une collection dédiée, seuil inatteignable avant lancement — voir [05.10](05-stockage-audio-internet-archive.md#510-mode-intérimaire--repli-sur-object-storage-infomaniak-pas-dinternet-archive-au-démarrage). En attendant, tout l'audio (original + proxy) reste sur Object Storage Infomaniak, derrière un flag `ARCHIVE_TO_IA=false`. À réactiver une fois le seuil atteint organiquement.
- [x] État `processing` visible côté utilisateur — `GET /recordings/:id` et `GET /recordings/mine`.

## Phase 3 — Écrans du MVP (frontend)

Implémentation fidèle aux 6 écrans + déclinaisons mobile déjà spécifiés dans [`design/system/`](../design/system/) et le [handoff](../design/handoff/DEV-HANDOFF.md) : Explorer, Découvrir, Recording Detail, Ajouter (3 étapes), Profil, Recherche. Respect strict des tokens, du responsive (§4 du handoff) et de l'accessibilité AA (§7 du handoff).

## Phase 4 — Carte et recherche

- [ ] Génération du premier fichier `.pmtiles` (Planetiler) pour l'emprise géographique de départ, hébergement Object Storage — voir [07](07-carte-open-source.md).
- [ ] Intégration MapLibre + style custom "Quiet Cartography".
- [ ] Clustering client (Supercluster), requêtes viewport PostGIS.
- [ ] Geocodage (Photon, instance de bootstrap → auto-hébergée).
- [ ] Indexation Meilisearch + écran Recherche.

## Phase 5 — Durcissement avant lancement

- [ ] Audit accessibilité complet (WCAG AA, §7 du handoff).
- [ ] Politique de modération minimale (signalement) — voir [10.3](10-securite-confidentialite-conformite.md#103-modération).
- [ ] Sauvegardes automatisées + premier test de restauration — voir [04.5](04-infra-infomaniak.md#45-sauvegardes).
- [ ] Politique de confidentialité, CGU, mentions légales (RGPD/nLPD) — voir [10.5](10-securite-confidentialite-conformite.md#105-conformité-rgpd--nlpd).
- [ ] Revue de sécurité (dépendances, headers HTTP, rate limiting auth).
- [ ] Auto-hébergement définitif des tuiles et du géocodage (sortie du mode bootstrap, voir [07.4](07-carte-open-source.md#74-bootstrap-vs-auto-hébergement-complet)).

## Phase 6 — Lancement public

- [ ] Bascule DNS finale sur `arborisis.com`.
- [ ] Annonce du dépôt GitHub comme officiellement ouvert aux contributions externes.
- [ ] Surveillance de la queue Internet Archive (temps de dérivation, taux d'échec) durant les premières semaines réelles d'usage.

---

Ce phasage priorise volontairement l'authentification et l'archivage (Phase 1-2) avant les écrans (Phase 3), parce que ce sont les deux briques les plus structurantes et les plus coûteuses à changer rétroactivement — le reste de l'UI peut s'affiner en continu une fois ce socle stable.

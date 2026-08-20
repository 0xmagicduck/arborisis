# Arborisis

Cartographie et archivage sonore ouvert — un commun numérique pour les enregistrements de paysages sonores, hébergé de façon pérenne et indépendante.

- **Vision & principes** : [plan/01-vision-et-principes.md](plan/01-vision-et-principes.md)
- **Documentation technique complète** : [plan/README.md](plan/README.md)
- **Suivi d'avancement** : [plan/TASKS.md](plan/TASKS.md) · [plan/11-roadmap.md](plan/11-roadmap.md)
- **Design system** : [design/README.md](design/README.md)

## Statut

🚧 Phase 5 close (audit accessibilité, modération, sauvegardes testées en restauration réelle, pages légales, revue de sécurité — 0 vulnérabilité `pnpm audit` — géocodage Photon auto-hébergé en index planète complet et tuiles servies depuis l'Object Storage Infomaniak). Phases 3-4 (écrans du MVP, carte/recherche) restent closes également, y compris Login/Register désormais réimplémentés contre le design system (`AuthPage`, composants partagés) et vérifiés en conditions réelles. Détail des tâches et journal de session : [plan/TASKS.md](plan/TASKS.md). L'application elle-même n'est pas encore déployée sur `arborisis.com` (toujours une page de statut minimale) — la bascule est prévue en [Phase 6](plan/11-roadmap.md). L'intégration Internet Archive est **reportée** après le lancement (seuil de 50 items déjà publiés exigé par IA, hors de portée avant d'avoir des utilisateurs réels) — voir [plan/05-stockage-audio-internet-archive.md §5.10](plan/05-stockage-audio-internet-archive.md#510-mode-intérimaire--repli-sur-object-storage-infomaniak-pas-dinternet-archive-au-démarrage).

## Pour les agents IA

Avant de reprendre ce dépôt : lire [CLAUDE.md](CLAUDE.md) — sources de vérité, conventions déjà en place, et procédures de fin de session (`plan/TASKS.md`, `plan/MEMORY.md`, ce README).

## Licence

- Code (`apps/`, `packages/`) : [AGPL-3.0](LICENSE)
- Documentation (`plan/`, `design/`) : CC-BY-SA 4.0
- Contenu utilisateur (enregistrements) : au choix du contributeur (CC0 / CC-BY / CC-BY-SA / CC-BY-NC), voir [plan/05-stockage-audio-internet-archive.md](plan/05-stockage-audio-internet-archive.md)

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) et le [Code de conduite](CODE_OF_CONDUCT.md).

## Sécurité

Voir [SECURITY.md](SECURITY.md) pour signaler une vulnérabilité.

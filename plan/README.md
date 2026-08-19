# Arborisis V2 — Plan d'infrastructure & technologie

Ce dossier documente les choix techniques et d'infrastructure pour le développement d'Arborisis, en cohérence avec le design retenu ([`../design/`](../design/)) et les contraintes du projet :

- Hébergement final sur **Infomaniak Public Cloud** (Suisse, décarboné, indépendant des GAFAM).
- Le son (les enregistrements) archivé de façon pérenne sur **Internet Archive**.
- Projet **open source** dès le premier commit (GitHub, licence claire).
- Nom de domaine **arborisis.com**.
- Authentification **sans email/mot de passe** — clé d'accès physique / passkeys (WebAuthn).
- Carte : **100% open source, aucune API payante** (pas de Mapbox/Google Maps token, pas de Maptiler payant).

Ces contraintes ne sont pas que techniques : elles découlent directement de l'esprit du produit (calme, sobriété, pérennité, absence de dépendance à un tiers commercial) documenté dans [`01-vision-et-principes.md`](01-vision-et-principes.md).

## Sommaire

| Doc | Contenu |
|---|---|
| [01-vision-et-principes.md](01-vision-et-principes.md) | Principes d'ingénierie dérivés du produit |
| [02-architecture-generale.md](02-architecture-generale.md) | Vue d'ensemble du système, schéma, flux de données |
| [03-stack-technique.md](03-stack-technique.md) | Choix de langages/frameworks/librairies, avec justification |
| [04-infra-infomaniak.md](04-infra-infomaniak.md) | Provisioning Infomaniak Public Cloud, domaine, backups, scaling |
| [05-stockage-audio-internet-archive.md](05-stockage-audio-internet-archive.md) | Pipeline d'upload, intégration Internet Archive, métadonnées |
| [06-authentification-sans-mot-de-passe.md](06-authentification-sans-mot-de-passe.md) | WebAuthn/passkeys, modèle de données, récupération de compte |
| [07-carte-open-source.md](07-carte-open-source.md) | Carte, tuiles, géocodage — 100% open source, zéro API payante |
| [08-donnees-et-recherche.md](08-donnees-et-recherche.md) | Schéma PostgreSQL/PostGIS, recherche Meilisearch |
| [09-open-source-devops.md](09-open-source-devops.md) | Structure du repo, licence, CI/CD, gouvernance |
| [10-securite-confidentialite-conformite.md](10-securite-confidentialite-conformite.md) | Menaces, minimisation des données, RGPD/nLPD, modération |
| [11-roadmap.md](11-roadmap.md) | Phasage du développement, du bootstrap au lancement public |
| [TASKS.md](TASKS.md) | Suivi des tâches par phase + journal de session chronologique |
| [MEMORY.md](MEMORY.md) | Pièges déjà rencontrés, organisés par thème — à consulter avant de retoucher une zone concernée |

## Décisions structurantes (résumé)

| Sujet | Décision par défaut | Raison courte |
|---|---|---|
| Frontend | Next.js + TypeScript | écosystème carto (MapLibre) le plus riche, contributeurs open source faciles à trouver |
| Backend | Node.js + Fastify + TypeScript | un seul langage frontend/backend, types partagés |
| Base de données | PostgreSQL 16 + PostGIS | géo-requêtes natives, standard, aucune dépendance propriétaire |
| Carte | MapLibre GL JS + PMTiles auto-hébergées | zéro clé API, zéro coût, licence libre |
| Géocodage | Nominatim/Photon (auto-hébergé à terme) | pas de Google Places / Mapbox Geocoding |
| Recherche | Meilisearch auto-hébergé | léger, open source, remplace Elasticsearch |
| Audio (original) | Internet Archive (IAS3) | pérennité indépendante du sort du projet, gratuit |
| Audio (lecture rapide) | proxy transcodé sur Object Storage Infomaniak | latence maîtrisée, IA reste la source d'archive |
| Authentification | WebAuthn (passkeys + clé physique), aucun mot de passe/email | supprime le phishing et le credential stuffing à la racine |
| Hébergement compute | 1 VM Infomaniak Public Cloud + Docker Compose (MVP) | sobriété opérationnelle, pas de Kubernetes prématuré |
| Licence code | AGPL-3.0 | empêche un fork commercial fermé sans redonner au commun |
| Licence contenu (sons) | CC0 / CC-BY / CC-BY-SA au choix du contributeur, jamais "tous droits réservés" | condition d'hébergement sur Internet Archive |

Chaque décision est détaillée, avec alternatives considérées, dans les documents correspondants. Les points encore ouverts (nécessitant un arbitrage de ta part) sont listés en fin de chaque document sous **« À trancher »**.

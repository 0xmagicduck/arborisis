# 1. Vision et principes d'ingénierie

## 1.1 Ce que dit déjà le design

Le [handoff design](../design/handoff/DEV-HANDOFF.md) est très explicite sur l'esprit du produit : « la carte et l'écoute priment sur tout le reste », aucune gamification, aucune statistique hors un compteur simple, quasi monochrome, aucune animation permanente. Arborisis est une **archive**, pas un réseau social à engagement.

Cet esprit doit se prolonger dans l'infrastructure, pas seulement dans l'interface. Un choix technique qui viserait la croissance, le tracking ou la dépendance à un acteur commercial fermé serait incohérent avec le produit lui-même.

## 1.2 Principes qui guident chaque décision de ce dossier

1. **Pérennité avant tout.** Un enregistrement de terrain (chant d'oiseau, ambiance de forêt) a une valeur qui dépasse la durée de vie probable du projet Arborisis. D'où l'archivage sur Internet Archive : même si Arborisis s'arrête un jour, les sons restent accessibles indépendamment.
2. **Sobriété opérationnelle.** Pas d'infrastructure plus complexe que ce que le trafic réel justifie. Un projet porté par une petite équipe (voire une personne) ne doit pas avoir à maintenir un cluster Kubernetes pour servir quelques milliers de requêtes/jour. On choisit des architectures qui **montent en charge plus tard**, pas qui anticipent une charge hypothétique.
3. **Minimisation des données.** Pas d'email, pas de tracking publicitaire, pas de collecte "au cas où". Ce qui n'est pas collecté ne peut pas fuiter.
4. **Réversibilité / anti-lock-in.** Chaque brique choisie doit pouvoir être remplacée sans réécrire le produit : formats ouverts (PostGIS, PMTiles, S3-compatible), pas de SDK propriétaire embarqué dans le cœur produit, infra décrite en code plutôt qu'en clics dans une console.
5. **Ouverture par défaut.** Code sur GitHub, licence explicite, documentation destinée à un contributeur externe et pas seulement à toi. Les choix d'infra eux-mêmes doivent être compréhensibles et reproductibles par un tiers (d'où ce dossier).
6. **Aucune dépendance à une API payante pour les fonctions cœur** (carte, géocodage, recherche, lecture audio). Des services tiers gratuits/ouverts peuvent servir de point de départ, mais le chemin vers l'auto-hébergement complet doit toujours être ouvert et documenté.
7. **Sécurité par construction plutôt que par correction.** L'authentification sans mot de passe n'est pas un gadget : elle supprime une classe entière de risques (fuite de base de mots de passe, phishing de mot de passe, réutilisation de mot de passe) au lieu de la mitiger après coup.

## 1.3 Ce que ces principes excluent explicitement

- Mapbox GL JS avec token payant, Google Maps/Places, Maptiler Cloud en dépendance de production.
- Auth0/Clerk/Firebase Auth ou tout fournisseur d'identité tiers qui repose sur l'email comme identifiant.
- Analytics intrusifs (Google Analytics, Meta Pixel).
- Stockage audio uniquement chez un cloud commercial sans copie pérenne indépendante.
- Kubernetes, service mesh, micro-services multiples dès le MVP — complexité à justifier par la charge réelle, pas anticipée.

## 1.4 Ce que ces principes autorisent, avec discernement

Un service tiers gratuit et non-verrouillant peut être utilisé en bootstrap (ex. build public de tuiles Protomaps, instance publique Photon) **tant que la doc explique comment le remplacer par une version auto-hébergée**, et tant qu'aucune fonctionnalité cœur ne casse si le service disparaît (dégradation gracieuse, pas de panne totale).

Voir [07-carte-open-source.md](07-carte-open-source.md) pour l'application concrète de ce principe à la carte.

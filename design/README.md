# Arborisis V2 — Design

Refonte complète d'Arborisis (archive sonore naturaliste, géographique et communautaire). Direction visuelle retenue : **Quiet Cartography**.

## Contenu de ce dossier

- **[`handoff/DEV-HANDOFF.md`](handoff/DEV-HANDOFF.md)** — dossier de handoff développeur : tokens, spécification de chaque composant et de chaque écran, responsive, animation, accessibilité. À lire en premier avant toute implémentation.
- **[`system/`](system/)** — mockups `.dc.html` du système retenu : fiche de design system + 6 écrans du MVP (desktop) + 7 déclinaisons mobile. Chaque fichier est un HTML autonome avec CSS inline, ouvrable directement dans un navigateur pour inspection visuelle.
- **[`explorations/`](explorations/)** — les 3 directions visuelles explorées avant décision (Naturalist Archive, Field Journal, Quiet Cartography) + la note de cadrage produit. Conservées comme trace de la décision, pas comme référence d'implémentation.

## Aperçu interactif

L'ensemble (explorations + système retenu) est publié sous forme de canvas visuel pan/zoom :
https://claude.ai/code/artifact/7d85cdd2-c7c2-48bc-84d0-a416b3aa00e5

## Écrans du MVP

1. Explorer — carte du monde
2. Découvrir — feed éditorial
3. Recording Detail — fiche d'un enregistrement
4. Ajouter — upload en 3 étapes (Sound / Place & details / Publish)
5. Profil
6. Recherche

Chaque écran existe en version desktop et mobile dans `system/`. Aucune gamification, un seul niveau de navigation, aucune donnée statistique hors le compteur d'enregistrements du profil.

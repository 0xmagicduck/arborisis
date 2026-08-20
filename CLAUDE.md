# CLAUDE.md — guide pour les agents IA travaillant sur Arborisis

Ce fichier s'adresse à Claude Code (ou tout autre agent IA) qui reprend ce
dépôt d'une session à l'autre. Il ne remplace aucun document du projet — il
explique **où trouver la vérité** et **comment laisser le dépôt dans un état
que la prochaine session pourra reprendre sans redécouvrir ce qui est déjà
su**.

Lis-le en entier avant de coder. Il est court exprès.

---

## 1. Ce qu'est Arborisis

Archive sonore naturaliste, géographique et communautaire — un commun
numérique pour des enregistrements de paysages sonores, hébergé de façon
pérenne et indépendante (voir [plan/01-vision-et-principes.md](plan/01-vision-et-principes.md)).

MVP : 6 écrans, un seul niveau de navigation, aucune gamification, aucune
dépendance à une API payante pour les fonctions cœur (carte, géocodage,
recherche, lecture audio).

## 2. Sources de vérité — ne pas deviner, lire

| Question | Où chercher |
|---|---|
| Où en est le projet, qu'est-ce qui reste à faire | [plan/TASKS.md](plan/TASKS.md) — **toujours le lire en premier**, section "Prochaine session" en bas |
| Pièges déjà rencontrés dans une zone du code | [plan/MEMORY.md](plan/MEMORY.md) — organisé par thème, lire l'entrée correspondante *avant* de retoucher cette zone |
| Décisions produit / architecture / infra | `plan/0{1..11}-*.md` — chaque fichier a un numéro et un sujet, voir [plan/README.md](plan/README.md) pour l'index |
| Apparence exacte d'un écran (couleurs, tailles, espacements) | [design/handoff/DEV-HANDOFF.md](design/handoff/DEV-HANDOFF.md) — spec composant par composant et écran par écran |
| Rendu pixel de référence | `design/system/*.dc.html` — fichiers HTML autonomes, ouvrables tels quels dans un navigateur |

Le handoff design est **indépendant de toute stack** et parfois plus
prescriptif que les mockups eux-mêmes (ex. il documente explicitement des cas
non illustrés — état vide, erreur, chargement). En cas de divergence entre le
texte du handoff et un pixel précis d'un mockup, privilégier le mockup pour
le rendu visuel mais le handoff pour le *comportement* (accessibilité,
responsive, cas limites) — et documenter le choix si la divergence est
notable (voir §4).

## 3. Conventions de code déjà en place — les respecter, pas les redécouvrir

- **Commentaires en français, qui expliquent le "pourquoi" pas le "quoi".**
  Le code de ce repo commente abondamment les décisions non évidentes
  (pourquoi cet ordre d'enregistrement Fastify, pourquoi cette colonne est un
  `customType`, pourquoi ce composant duplique son rendu en CSS plutôt qu'en
  JS). Continuer ce style plutôt que des commentaires qui paraphrasent le code.
- **Design system fermé** (`packages/design-tokens/src/tokens.css`) : aucune
  couleur/radius/ombre en dehors des tokens sans validation — voir
  DEV-HANDOFF §1.4 pour la liste des deux seules exceptions du système entier.
- **Web (`apps/web`)** : App Router Next.js, composants client (`"use client"`)
  systématiques dès qu'il y a interaction — pas de Server Components pour les
  écrans du MVP (cohérent avec l'existant : sessions/panier lecture audio
  côté client). CSS Modules par composant, jamais de styles inline pour des
  règles réutilisées. Un même composant gère desktop **et** mobile via des
  media queries CSS, pas de duplication de composants "Mobile*" — le
  responsive est fluide (`%`/media queries), jamais une largeur figée reprise
  d'un mockup à 390px.
- **API (`apps/api`)** : Fastify + Zod. `app.setErrorHandler` doit rester
  enregistré avant les routes (voir plan/MEMORY.md). Un enregistrement n'est
  visible publiquement que si `status === "published"` (pas de fuite
  d'existence pour les autres statuts, voir `apps/api/src/routes/recordings.ts`).
- **Un seul `<audio>` actif à la fois** dans tout le frontend, via le contexte
  partagé `apps/web/lib/audio-player.tsx` — ne pas instancier d'`<audio>`
  local dans un composant d'écran.
- **Honnêteté sur ce qui est simplifié.** Quand une fonctionnalité du mockup
  n'a pas de contrepartie backend pour la phase en cours (ex. filtres
  Recherche "location/tag/duration" avant Meilisearch), l'afficher en état
  inerte plutôt qu'en interaction qui ne fait rien, et documenter pourquoi en
  commentaire + journal (§4). Ne jamais fabriquer une donnée pour combler un
  vide visuel (voir §2.5/§2.9 du handoff : listes vides, tags absents,
  valeurs "Technical" manquantes → la ligne est omise, jamais un "—" ou "N/A"
  improvisé sauf quand le handoff le prescrit explicitement).

## 4. Fin de session : ce qu'il faut mettre à jour, dans cet ordre

Ce dépôt vit sur trois documents vivants qui ne sont **pas optionnels** en
fin de session. Un agent qui code sans les tenir à jour laisse la session
suivante repartir à l'aveugle.

### 4.1 `plan/TASKS.md`

- Cocher les cases (`☐`→`▶`→`☑`, ou `⛔` avec la raison en note) des tâches
  réellement terminées — pas "écrites", *vérifiées* (voir §5).
- Mettre à jour la ligne "Dernière mise à jour" en tête de fichier.
- Ajouter une entrée au **Journal de session** en bas du fichier (format
  existant : `- AAAA-MM-JJ : ce qui a été fait, ce qui a été vérifié
  concrètement, les bugs réels trouvés et corrigés au passage`). C'est un
  historique chronologique — ne jamais réécrire une entrée passée.
- Mettre à jour "Prochaine session" avec l'état exact où reprendre.

### 4.2 `plan/MEMORY.md`

Ajouter une entrée **seulement** si un piège réel a été rencontré (pas une
note générique) : quelque chose qui a fait perdre du temps, une bibliothèque
qui se comporte différemment de sa doc, une contrainte d'environnement
surprenante. Format existant : le piège, pourquoi il s'est produit, la règle
à appliquer, lien vers le fichier concerné. Regrouper sous la section
thématique existante la plus proche (créer une nouvelle section si le thème
n'existe pas encore, ex. "Frontend / Next.js").

### 4.3 `README.md` (racine)

Le README racine doit toujours refléter la phase réellement atteinte — ne
pas le laisser dériver derrière `plan/TASKS.md`. À chaque changement de
phase (ou avancée notable dans la phase en cours), mettre à jour la section
"Statut" avec la phase courante et un lien vers l'entrée du journal
correspondante. Ce n'est pas un résumé détaillé (ça, c'est `plan/TASKS.md`) —
une ou deux phrases suffisent, avec les liens qui pointent vers le détail.

### 4.4 Ordre pour ne rien oublier

1. Coder / vérifier (§5).
2. `plan/MEMORY.md` — si un piège a été découvert en cours de route, l'écrire
   *pendant* que le contexte est frais, pas en fin de session de mémoire.
3. `plan/TASKS.md` — cases + journal + prochaine session.
4. `README.md` — statut.
5. Commit (voir CONTRIBUTING.md pour le format).

## 5. "Vérifié" a un sens précis dans ce dépôt

La culture de ce projet, visible dans tout `plan/TASKS.md`, est de ne
marquer une tâche `☑` qu'après une vérification réelle, pas une relecture du
code : build/typecheck/lint/test exécutés (pas seulement écrits), et pour ce
qui touche à un comportement observable (cérémonie WebAuthn, migration DB,
upload de fichier, rendu d'écran), une vérification en conditions réelles
contre des services vivants (Postgres/Redis/MinIO via `docker compose up`,
navigateur réel). Les bugs réels trouvés *pendant* cette vérification sont
documentés dans le journal — c'est une preuve que la vérification a eu lieu,
pas un aveu à cacher.

Pour un écran frontend, "vérifié" veut dire : lancé contre l'API réelle avec
des données seedées, comparé visuellement au mockup `.dc.html` correspondant
via le navigateur (pas juste "le code compile"). Voir la session Phase 3 dans
le journal pour un exemple du niveau de détail attendu (seed SQL direct,
session Redis manuelle, capture d'écran comparée écran par écran, un cycle
d'upload complet exécuté réellement).

## 6. Faire tourner le projet en local

```bash
cp .env.example .env
docker compose up -d        # Postgres/PostGIS, Redis, Meilisearch, MinIO
pnpm install
pnpm db:migrate
pnpm dev                    # apps/web (3000), apps/api (4000), apps/worker
```

Piège d'environnement connu : `apps/api` en mode `tsx watch` peut entrer dans
une boucle de redémarrage (`EADDRINUSE`) si un autre process tourne sur le
même port au même moment (ex. `next dev` qui hérite de la variable `PORT` du
`.env` si elle est sourcée dans le même shell pour les deux apps — sourcer
`.env` séparément par process, ou lancer `next dev -p 3000` explicitement).
Pour une vérification manuelle ponctuelle sans hot-reload, `npx tsx
src/index.ts` (sans `watch`) dans `apps/api` est plus stable.

Voir aussi le piège multi-worktree documenté dans `plan/MEMORY.md`
("Infra / environnement d'exécution local") avant de lancer `docker compose
down`/`rm` si plusieurs worktrees de ce dépôt sont actifs en parallèle.

## 7. Portée de ce fichier

Ce fichier documente le *fonctionnement* du dépôt (où est la vérité,
comment le laisser à jour), pas son *contenu* (l'architecture, les décisions
produit vivent dans `plan/`). S'il devient redondant avec `plan/` ou
`design/`, corriger `plan/`/`design/` et raccourcir ce fichier plutôt que de
laisser deux versions d'une même information diverger.

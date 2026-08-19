# Arborisis V2 — Dossier de handoff développeur

**Direction visuelle retenue :** Quiet Cartography
**Source de vérité :** [`design/system/`](../system/) — mockups `.dc.html` autonomes (HTML + CSS inline), lisibles directement dans un navigateur. `design/explorations/` contient les 3 directions écartées, gardées comme trace de la décision.

Ce document est indépendant de toute stack front. Les tokens sont donnés comme variables CSS ; libre à l'implémentation de les porter dans Tailwind, CSS Modules, styled-components, etc.

---

## 0. Vue d'ensemble produit

Arborisis est une archive sonore naturaliste, géographique et communautaire. Le MVP couvre 6 destinations, un seul niveau de navigation, aucune gamification :

1. **Explorer** — carte du monde, point d'entrée principal
2. **Découvrir** — feed éditorial des enregistrements récents
3. **Recording Detail** — fiche d'un enregistrement
4. **Ajouter** — upload en 3 étapes (Sound → Place & details → Publish)
5. **Profil** — identité + liste des enregistrements de l'utilisateur
6. **Recherche** — recherche texte + filtres simples

Principe transversal : la carte et l'écoute priment sur tout le reste. Aucune donnée statistique hors un compteur d'enregistrements sur le profil. Aucun follower/like/score.

---

## 1. Design tokens

### 1.1 Couleur

```css
:root {
  /* Surfaces */
  --color-paper: #FAFAF8;      /* fond de page, unique fond de toute l'app */

  /* Encre — hiérarchie de texte, toutes dérivées d'une même teinte chaude proche du noir */
  --color-ink-strong: #131210;   /* titres appuyés (ex. titre de RecordingDetail) */
  --color-ink: #201E1B;          /* texte principal, icônes, bordures actives */
  --color-ink-quote: #3A3733;    /* citations / descriptions en italique */
  --color-ink-secondary: #5C5A55;/* texte secondaire (lieu, méta) */
  --color-stone: #8D8A85;        /* micro-labels, texte tertiaire, nav inactive */
  --color-ink-faint: #B8B5AF;    /* durées, texte le plus discret */

  /* Accent — un seul, utilisé avec parcimonie */
  --color-accent: #33513E;       /* forêt — sélection carte, bouton lecture, radio actif */

  /* Optionnel, rare */
  --color-earth: #8C6A4E;        /* réservé à une métadonnée technique ponctuelle ; non utilisé dans le MVP actuel */

  /* Lignes — dérivées de l'encre par opacité, jamais une couleur grise à part */
  --line-hairline: rgba(32, 30, 27, 0.12);  /* séparateurs de listes, sous-header */
  --line-medium: rgba(32, 30, 27, 0.18);    /* traits du step indicator */
  --line-strong: rgba(32, 30, 27, 0.30);    /* bordures de panneaux/cartes/inputs */
  --line-strongest: rgba(32, 30, 27, 0.35); /* bordures de panneaux flottants (Explorer) */
}
```

**Règles strictes :**
- Aucun dégradé, nulle part.
- Aucune couleur additionnelle sans validation design — le système est volontairement quasi monochrome.
- `--color-accent` ne sert jamais de couleur de fond pleine sur de grandes surfaces ; il marque un état (sélectionné, en lecture, actif) sur de petits éléments (anneau de 1px, disque de 3px, bouton play).
- Pas de mode sombre spécifié dans ce MVP — si demandé plus tard, inverser `--color-paper`/`--color-ink` en conservant `--color-accent` proche (à valider en design).

### 1.2 Typographie

```css
:root {
  --font-sans: 'Public Sans', system-ui, sans-serif;   /* interface, corps, nav, méta */
  --font-serif: 'Source Serif 4', serif;                 /* UNIQUEMENT les titres d'enregistrement, en italique */
}
```

| Token | Famille | Style | Taille | Usage |
|---|---|---|---|---|
| `text-display` | serif | italic 400 | 34–36px | Titre de RecordingDetail |
| `text-title-lg` | serif | italic 400 | 22–26px | Titre en vedette (Discover featured), panneau sélection Explorer |
| `text-title` | serif | italic 400 | 15–19px | Titre de RecordingRow/Card |
| `text-tagline` | serif | italic 400 | 13–20px | « Listen to the places around us. » |
| `text-nav` | sans | 500 | 12px | Items de navigation header |
| `text-wordmark` | sans | 500, letter-spacing 0.18em | 13px | « ARBORISIS » |
| `text-body` | sans | 400 | 13–14px | Bio, descriptions techniques |
| `text-meta` | sans | 400 | 11.5–12.5px | Lieu, date, durée |
| `text-micro-label` | sans | 500, uppercase, letter-spacing 0.1–0.12em | 10px | « Selected », « Field recordings », étapes |

**Règles strictes :**
- Le serif n'est **jamais** utilisé pour de l'UI (boutons, nav, labels) — uniquement pour un titre d'enregistrement ou la tagline éditoriale.
- Pas de graisse > 600 nulle part. Pas de tout-capitales sauf les micro-labels et le wordmark.
- « Pas de titres géants » : `text-display` (36px) est le plafond absolu de toute l'app.
- Fallback obligatoire si Google Fonts échoue à charger : `system-ui` pour le sans, `Georgia, serif` pour le serif — prévoir `font-display: swap`.

### 1.3 Espacement

Base 8px. Pas de grille rigide imposée mais ces paliers reviennent systématiquement dans les mockups :

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 40px;
  --space-8: 48px;
  --space-9: 64px;
}
```

### 1.4 Radius & ombre

```css
:root {
  --radius-none: 0;
  --radius-circle: 50%;          /* avatars, boutons de lecture — SEUL usage de radius sur desktop */
  --radius-sheet: 14px;           /* coins hauts de la bottom sheet mobile UNIQUEMENT */
  --shadow-sheet: 0 -6px 18px rgba(32, 30, 27, 0.06); /* SEULE ombre autorisée dans tout le système */
}
```

**Règle stricte :** tout panneau, carte, input, bouton, tag reçoit `--radius-none` et aucune ombre. Les deux seules exceptions du système entier sont documentées ci-dessus. Un développeur qui ajoute un radius ou une ombre ailleurs s'écarte du système — à signaler en revue plutôt qu'à corriger silencieusement.

### 1.5 Bordures

Épaisseur unique : **1px**, jamais 2px sauf le bouton de lecture principal de RecordingDetail (voir composant PlayButton) et l'anneau du marqueur sélectionné sur mobile qui restent à 1px également — vérifier qu'aucune bordure ne dépasse 1.5px dans l'implémentation finale.

---

## 2. Composants partagés

### 2.1 `Header` (desktop)

| Prop | Type | Détail |
|---|---|---|
| `activeNav` | `'explorer' \| 'decouvrir' \| 'ajouter' \| 'recherche' \| null` | `null` sur les pages secondaires (RecordingDetail, Profil) où aucun item n'est actif |
| `showTagline` | boolean | Affichée sur Explorer et Discover uniquement (voir par écran) |

**Layout** : padding `22px 40px`, `border-bottom: 1px solid var(--line-hairline)`, flex row `justify-content: space-between`. Wordmark à gauche, nav centrée (gap `32px`), avatar (+ tagline optionnelle) à droite.

**États nav item** :
- Actif : `color: var(--color-ink)`, `font-weight: 500`
- Inactif : `color: var(--color-stone)`, `font-weight: 400`
- Hover (à spécifier à l'implémentation) : transition `color 150ms ease` vers `var(--color-ink)`, jamais de soulignement animé ni de fond.
- Focus clavier : `outline: 1px solid var(--color-ink); outline-offset: 3px` (aucun outline design par défaut du navigateur — remplacer, ne pas supprimer).

**Avatar** : cercle 26px, `border: 1px solid var(--color-ink)`, initiale centrée en `text-nav`. Le seul écran où l'avatar est trouvé **rempli** dans une itération précédente (Profil) a été corrigé pour rester cohérent avec le contour — l'avatar de header est **toujours en contour**, jamais rempli, quel que soit l'écran.

### 2.2 `PlayButton`

| Prop | Type | Détail |
|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | sm=28-32px (listes), md=36-44px (panneaux), lg=52-64px (RecordingDetail, mobile) |
| `state` | `'paused' \| 'playing' \| 'loading'` | |
| `variant` | `'outline' \| 'filled'` | `outline` = fond `--color-paper`, bordure `--color-ink` ou `--color-accent` selon contexte ; `filled` = fond `--color-accent`, icône `--color-paper` — utilisé pour le CTA de lecture principal (panneau Explorer, mobile, RecordingDetail) |

**Icône** : triangle SVG dessiné en path (pas de font-icon, pas d'emoji). Ratio play-triangle `10:12`. Pas de coin arrondi sur le triangle.

**États** :
- `paused` → triangle plein.
- `playing` → deux barres verticales (pause), même gabarit.
- `loading` → à spécifier : recommandation = anneau qui pulse doucement (`opacity` 0.4↔1, 1.2s, `ease-in-out`, boucle) plutôt qu'un spinner classique, pour rester cohérent avec l'esthétique calme. **Respecter `prefers-reduced-motion` : sans animation, l'icône reste simplement à `opacity: 0.6` pendant le chargement.**
- Cible tactile minimale sur mobile : 44×44px même si le visuel fait 32px (padding invisible autour de l'icône).

### 2.3 `Waveform`

Représentation : barres verticales SVG, largeur de barre 1.2–2px selon contexte, `gap` implicite via `x` incrémental, hauteur variable, couleur `var(--color-ink)` à `opacity: 0.65–0.8`.

| Prop | Type | Détail |
|---|---|---|
| `data` | `number[]` | Amplitudes normalisées 0–1, une par barre |
| `progress` | `number` (0–1) | Position de lecture — les barres avant `progress` passent à `opacity: 1` et/ou `color: var(--color-accent)` (à valider en design ; les mockups actuels ne montrent que l'état statique) |
| `interactive` | boolean | Si `true`, clic/tap sur une barre = seek à cette position |
| `size` | `'inline' \| 'row' \| 'detail'` | inline (dans un panneau, ~170–220px large, 18–30px haut), row (feed/liste), detail (pleine largeur, 60px haut sur desktop, 40px sur mobile) |

**Génération des données réelles** : les barres des mockups sont dessinées à la main pour l'exemple visuel — en production, dériver `data` d'une analyse d'amplitude du fichier audio (peak ou RMS par fenêtre), rééchantillonnée au nombre de barres disponibles selon la largeur du conteneur.

**Accessibilité** : le waveform n'est pas le contrôle de lecture principal — il est décoratif/informatif à côté du `PlayButton`. `aria-hidden="true"` sur le SVG ; si `interactive`, ajouter `role="slider"` avec `aria-valuenow`/`aria-valuemin`/`aria-valuemax` sur le conteneur, pas sur chaque barre.

### 2.4 `MapMarker`

Trois variantes, dessinées en SVG (jamais une image bitmap de pin) :

| Variante | Rendu | Usage |
|---|---|---|
| `default` | Point plein `r=2.6`, `fill: var(--color-ink)` | Enregistrement isolé non sélectionné |
| `selected` | Anneau `r=10, stroke: var(--color-accent), stroke-width:1` + point central `r=3.2, fill: var(--color-accent)` | Enregistrement actuellement affiché dans le panneau |
| `cluster` | Cercle `r=12–15`, `fill: var(--color-paper)`, `stroke: var(--color-ink)`, nombre centré en `text-meta` | Regroupement de plusieurs enregistrements proches, seuil de clustering à définir par l'équipe carto (ex. distance < 40px à un niveau de zoom donné) |

**Interaction** : tap/clic sur `default` → sélection + mise à jour du panneau + transition de la variante vers `selected` (voir §6 Animation). Tap sur `cluster` → zoom in centré sur le cluster (comportement standard des librairies de cartes — pas de comportement custom à inventer).

**Cible tactile mobile** : la zone cliquable dépasse le rendu visuel (marqueur visuel 5–12px, zone tactile minimum 32×32px centrée dessus).

### 2.5 `RecordingRow` / `RecordingCard`

Deux gabarits selon l'écran, mêmes données :

```ts
type Recording = {
  id: string;
  title: string;            // rendu en text-title, serif italique
  location: string;         // "Lieu, Pays"
  author?: string;          // affiché seulement sur Explorer (panneau) et Discover (featured)
  durationSeconds: number;  // formaté "m:ss"
  recordedAt: string;       // ISO date, formaté selon contexte ("16 August 2026" en detail, "Aug 16" en feed)
  tags: string[];           // jamais plus de ~4 affichés inline, rendus "tag1 · tag2 · tag3"
  waveform: number[];
};
```

- **Row** (Discover, Search, Profil mobile) : layout horizontal, `border-top: 1px solid var(--line-hairline)` entre chaque item, padding vertical 16–22px. Pas de fond, pas de bordure latérale, pas d'ombre.
- **Card** (Profil desktop, grille 3 colonnes) : cellules séparées par un trait 1px (`background: var(--line-hairline)` sur le conteneur grid avec `gap: 1px`, cellules en `--color-paper` — effet de grille sans dessiner 12 bordures individuelles).

**Titre trop long** : `text-overflow: ellipsis; white-space: nowrap; overflow: hidden` sur une seule ligne dans les listes ; en RecordingDetail (titre seul, grande taille), autoriser le retour à la ligne naturel.

**Tags en nombre variable** : si `tags` est vide, ne rien afficher (pas de placeholder "no tags"). Si plus de 4 tags, tronquer l'affichage à 3 + `« +2 »` en `--color-stone` plutôt que de faire déborder la ligne.

### 2.6 `StepIndicator` (flux Ajouter)

3 étapes fixes : `Sound`, `Place & details`, `Publish`.

| État de l'étape | Puce | Label |
|---|---|---|
| À venir | cercle 16–18px, `border: 1px solid var(--ink-faint, #B8B5AF)`, chiffre en `--color-ink-faint` | `color: var(--color-ink-faint)` |
| Actuelle | cercle plein `background: var(--color-ink)`, chiffre en `--color-paper` | `color: var(--color-ink)`, `font-weight: 500` |
| Complétée | cercle contour `border: 1px solid var(--color-ink)`, coche (✓) en `--color-ink` | `color: var(--color-ink-secondary)` |

Traits de connexion entre puces : `height: 1px; background: var(--line-medium)`, `flex: 1`.

**Navigation** : les étapes complétées sont cliquables pour revenir en arrière (retour à un état déjà rempli). L'étape à venir n'est pas cliquable tant que l'étape courante n'est pas validée.

### 2.7 `BottomSheet` (mobile, Explorer)

- Ancrée en bas de l'écran, `border-radius: 14px 14px 0 0`, `box-shadow: var(--shadow-sheet)`.
- Poignée de glissement : rectangle `34×3px`, `background: rgba(32,30,27,0.25)`, `border-radius: 2px`, centré, `margin-bottom: 20px`.
- **États** : `peek` (hauteur mockup actuelle, ~230px, montre le contenu essentiel), `expanded` (à spécifier si besoin de plus de détail — non couvert par le mockup actuel, à définir avec le design si nécessaire), `hidden` (aucun enregistrement sélectionné → sheet hors écran ou absente).
- **Geste** : swipe down pour fermer/réduire, swipe up pour agrandir si un état `expanded` est ajouté. Tap en dehors de la sheet (sur la carte) désélectionne et referme.
- **Contenu** : identique au panneau desktop (titre, lieu, auteur, PlayButton `lg` `filled`, Waveform `row`, durée).

### 2.8 `BottomTabBar` (mobile)

4 items : Explorer (icône pin), Découvrir (icône vagues), Ajouter (icône plus), Recherche (icône loupe). Le Profil n'est **pas** un 5ᵉ onglet — il se rejoint via l'avatar dans le header, cohérent avec le MVP "un seul niveau de navigation, cinq destinations" où Profil est accessible mais pas dans la barre de navigation principale.

- `border-top: 1px solid var(--line-hairline)`, padding `12px 0 22px 0` (le padding bas généreux couvre la safe-area des appareils à encoche — utiliser `env(safe-area-inset-bottom)` en plus, pas à la place).
- Icônes en trait SVG 1.3–1.5px, `stroke: var(--color-stone)` inactif / `var(--color-ink)` actif, jamais de remplissage plein sauf le petit indicateur d'avatar sur l'écran Profil.
- Label 9px sous chaque icône, même logique de couleur.
- Cible tactile : chaque item occupe une zone tactile de 44×44px minimum même si l'icône visuelle fait 20px.

### 2.9 `Button`

| Variante | Rendu |
|---|---|
| `primary` | `background: var(--color-ink); color: var(--color-paper)`, padding `10–11px 20–28px`, `font-size: 12–13px`, `font-weight: 500` |
| `secondary` | `border: 1px solid var(--color-ink); color: var(--color-ink)`, même padding, fond transparent |
| `disabled` | `opacity: 0.35`, `cursor: not-allowed`, pas de changement de couleur |

Une seule action `primary` par écran. Pas de variante colorée (l'accent vert n'est jamais utilisé comme fond de bouton plein — il reste réservé à la lecture/sélection).

### 2.10 `Input` / `Textarea`

`border: none; border-bottom: 1px solid var(--line-strong); background: transparent`, padding bas 8px, `font-family: var(--font-sans); font-size: 14px`. Pas de fond rempli, pas de bordure complète, pas de radius.

- Focus : `border-bottom-color: var(--color-ink)`, transition `border-color 150ms ease`.
- Erreur (non illustrée dans les mockups, à définir) : `border-bottom-color: #B3452F` (rouge terre, hors palette — à valider en design plutôt que d'improviser une couleur d'erreur qui casserait le système monochrome ; alternative recommandée : garder la bordure en `--color-ink` et porter l'erreur uniquement par le texte du message, en gras).
- Label : `text-meta`, `color: var(--color-stone)`, toujours visible au-dessus du champ (pas de placeholder-as-label).

### 2.11 `Tag`

Texte simple, jamais de pilule. Rendu : `title="tag1 · tag2 · tag3"`, `font-size: 11.5–12.5px`, `color: var(--color-ink-secondary)`. Séparateur = point médian `·` avec espace de chaque côté. Pas de fond, pas de bordure, pas de hover coloré — au clic (si les tags deviennent cliquables pour filtrer), simple soulignement.

### 2.12 `Panel` / bordure de carte

`border: 1px solid var(--line-strong)` (ou `--line-strongest` pour les panneaux flottants sur fond carte), `background: var(--color-paper)`, `padding: 20–24px`, **aucun radius, aucune ombre**.

---

## 3. Spécification par écran

### 3.1 Explorer (desktop) — [`Explorer.dc.html`](../system/Explorer.dc.html)

**Rôle** : écran d'atterrissage. La carte occupe l'essentiel du viewport (≈77% de la hauteur sous le header).

**Layout** :
- Header (avec tagline "Listen to the places around us." affichée à droite, en plus de l'avatar).
- Carte : `height: 740px` sur maquette 1440×980 (proportion à conserver en responsive fluide, pas une hauteur fixe en px).
- Panneau de sélection : flottant, ancré `bottom: 36px; left: 40px`, largeur fixe `320px`, au-dessus de la carte.
- Contrôles de zoom : flottants, `bottom: 20px; right: 20px`, deux boutons carrés 22px empilés (+ / –).
- Bande "Selected" en bas de la carte (dans le mockup desktop cette bande fait partie de la zone carte, `height: 96px`, `border-top: 1px solid var(--line-hairline)`) : liste horizontale de 4 enregistrements séparés par des traits verticaux `1px solid var(--line-hairline)`.

**États** :
- Aucune sélection → pas de panneau flottant affiché (la carte occupe tout l'espace).
- Sélection → panneau apparaît (voir §6 Animation), marqueur correspondant passe en variante `selected`.
- Survol d'un marqueur (desktop uniquement, pas de hover mobile) → tooltip minimal optionnel avec le titre seul (non illustré dans le mockup — recommandation : éviter, le clic direct suffit et un tooltip ajouterait du bruit visuel contraire aux principes).

**Cas limites** :
- Aucun enregistrement à proximité du viewport carte → aucun texte de vide n'est nécessaire, la carte reste simplement sans marqueur.
- Très grand nombre de marqueurs proches → clustering obligatoire au-delà d'un seuil à définir avec la librairie carto retenue (Mapbox GL, MapLibre, Leaflet…) ; les mockups utilisent un rendu topographique custom en SVG à titre d'exemple visuel — en production la carte est une vraie carte interactive, seul le **traitement graphique** (contours fins, absence de tuiles satellite saturées, marqueurs discrets) doit être reproduit via le style de la librairie choisie.

### 3.2 Découvrir (desktop) — [`Discover.dc.html`](../system/Discover.dc.html)

**Layout** : colonne centrée `max-width: 1040px`. Une entrée "featured" (plus grande, `text-title-lg`, PlayButton `md` outline, waveform 220px) suivie d'une liste de `RecordingRow` standard séparées par `border-top: 1px solid var(--line-hairline)`.

**Rythme éditorial** : l'entrée featured n'est pas nécessairement la plus récente — c'est un choix éditorial (le mockup ne prescrit pas d'algorithme). Prévoir un champ `featured: boolean` côté contenu plutôt que de déduire automatiquement la mise en avant du premier élément d'une liste triée par date.

**Chargement / pagination** : non illustré. Recommandation cohérente avec le ton du produit : chargement progressif discret (infinite scroll avec un espacement identique aux entrées existantes) plutôt qu'une pagination numérotée ou un bouton "Voir plus" trop visible.

**État vide** (aucun enregistrement) : message texte simple centré, en `text-body`, `color: var(--color-stone)`, ex. « Aucun enregistrement à afficher pour le moment. » — pas d'illustration, pas d'emoji.

### 3.3 Recording Detail — [`RecordingDetail.dc.html`](../system/RecordingDetail.dc.html)

**Layout** : colonne centrée `max-width: 820px`. Lien retour, titre `text-display`, méta (lieu · auteur/date), waveform pleine largeur + PlayButton `lg filled`, puis deux colonnes sous un trait (`flex: 1.4` description/tags/technique/lien externe, `flex: 1 max-width:260px` mini-carte).

**Bloc "Technical"** : liste clé/valeur simple (`display:flex; gap:10px`), **jamais un tableau HTML** — 4 lignes maximum (équipement, échantillonnage, format, licence). Si une donnée manque (ex. équipement inconnu), omettre la ligne entière plutôt que d'afficher "—" ou "N/A".

**Mini-carte** : `260×200px`, `border: 1px solid var(--line-strong)`, un seul marqueur `selected`, non interactive (pas de zoom/pan) — c'est un repère visuel, pas un explorateur ; un clic dessus peut naviguer vers Explorer recentré sur ce point (à confirmer produit).

**Lien "Original archived externally"** : `text-meta`, `color: var(--color-stone)`, souligné. N'apparaît que si une URL d'archive externe existe pour l'enregistrement — sinon, omis silencieusement (pas de placeholder désactivé).

**Cas limites** :
- Description absente → omettre le bloc citation entièrement (ne pas afficher de guillemets vides).
- Titre très long → autoriser le retour à la ligne à `text-display`, ne jamais tronquer un titre d'enregistrement sur cet écran (contrairement aux listes).

### 3.4 Ajouter — flux en 3 étapes

#### Étape 1 — Sound — [`Upload1.dc.html`](../system/Upload1.dc.html)

Zone de dépôt unique, `border: 1px solid var(--line-strong)`, padding généreux (64px vertical desktop), icône flèche-vers-le-haut + trait bas (dessinée en SVG, pas une icône de librairie), texte "Drop your recording here" + sous-texte formats acceptés + bouton secondaire "Browse files".

**États de la dropzone** :
- Défaut : tel que décrit.
- Drag-over : `border-color: var(--color-accent)`, fond peut passer à une teinte très légèrement teintée (`rgba(51,81,62,0.03)` — à valider, rester extrêmement subtil).
- Fichier invalide (mauvais format/trop lourd) : message d'erreur sous la dropzone en texte simple rouge-terre discret (voir note erreur au §2.10), la dropzone elle-même ne change pas de bordure de façon agressive.
- Upload en cours : barre de progression fine (2px), `background: var(--color-accent)`, sur `border-bottom` de la dropzone plutôt qu'un composant de progress séparé — cohérent avec "la progression doit être évidente sans prendre beaucoup de place".

**Limites** : formats acceptés WAV/FLAC/MP3 (préciser la taille max avec l'équipe backend — non spécifiée dans le brief produit).

#### Étape 2 — Place & details — [`Upload2.dc.html`](../system/Upload2.dc.html)

Récapitulatif du fichier (icône play outline 30px + nom de fichier + durée/format) puis 4 champs `Input`/`Textarea` en colonne unique : Title, Location, Description, Tags (séparés par virgules — pas d'UI de pilules à la saisie, cohérent avec le rendu final en texte simple).

**Location** : dans le mockup c'est un champ texte simple. Si un autocomplete géographique est ajouté (recommandé pour la qualité de données), le rendu visuel reste un `Input` standard — la liste de suggestions apparaît sous le champ, fond `--color-paper`, `border: 1px solid var(--line-strong)`, items séparés par `--line-hairline`, pas de survol coloré (juste `background: rgba(32,30,27,0.04)` au survol/focus clavier).

**Validation** : Title et Location obligatoires pour activer "Continue" (`Button primary`, sinon `disabled`). Description et Tags optionnels.

#### Étape 3 — Publish — [`Upload3.dc.html`](../system/Upload3.dc.html)

Carte de récapitulatif (titre, lieu, waveform, durée, tags), sélecteur de licence en radio buttons custom (cercle 12px, point central 6px en `--color-accent` si sélectionné), bouton primaire "Publish recording".

**État après publication** : redirection vers RecordingDetail du nouvel enregistrement (comportement standard, non illustré). Toast/confirmation discrète optionnelle, texte simple, pas de modale.

### 3.5 Profil (desktop) — [`Profile.dc.html`](../system/Profile.dc.html)

**Layout** : colonne centrée `max-width: 920px`. Bloc identité (avatar 72px contour, nom `font-weight:500 20px`, bio, "Pays · N recordings") puis grille 3 colonnes de `RecordingCard` séparées par un trait 1px (technique `gap:1px` sur fond `--line-hairline`, cellules `--color-paper`).

**Compteur** : uniquement `"{count} recordings"` en texte plat à côté de la localisation — **jamais** un chiffre en gros caractère façon stat/dashboard. Pas de compteur d'écoutes, de likes, ni de followers/following pour ce MVP (confirmé par le brief produit).

**Grille responsive** : 3 colonnes desktop → 2 colonnes tablette (~768–1024px) → liste 1 colonne mobile (voir §3.7, gabarit `Row` et non `Card` sur mobile pour rester léger).

**Profil vide** (aucun enregistrement) : message texte simple sous "Field recordings", ex. « Cette personne n'a pas encore publié d'enregistrement. »

### 3.6 Recherche (desktop) — [`Search.dc.html`](../system/Search.dc.html)

**Layout** : colonne centrée `max-width: 820px`. Champ de recherche pleine largeur en `Input` géant (`font-size: 24px`, `border-bottom: 1px solid var(--line-strong)`), ligne de filtres (liens texte soulignés "location", "tag", "duration"), compteur de résultats en texte plat, puis liste `RecordingRow` identique à Discover.

**Filtres** : dans le mockup ce sont des liens texte, pas des boutons/pilules. Au clic, ouvrent un contrôle simple (menu déroulant minimal ou insertion inline d'un second champ) — pas de modale, pas de panneau latéral lourd. À spécifier plus précisément avec le design si les filtres se complexifient.

**Recherche vide / sans résultat** : « Aucun résultat pour "{query}". » en texte simple, éventuellement une suggestion d'élargir la recherche — pas d'illustration.

**Debounce** : recommandé 250–300ms sur la saisie avant de déclencher la requête, pour éviter une requête par frappe.

### 3.7 Mobile

Tous les écrans mobile sont conçus sur un gabarit **390×844** (iPhone standard) mais doivent être fluides, pas figés à cette largeur — utiliser `%`/`vw` et `env(safe-area-inset-*)`, pas de dimensions en dur reprises du mockup.

- **MobileExplorer** — [`MobileExplorer.dc.html`](../system/MobileExplorer.dc.html) : carte plein écran sous un top bar flottant (wordmark en étiquette + avatar, tous deux sur fond `--color-paper` semi-isolé du reste pour rester lisibles au-dessus de la carte). `BottomSheet` apparaît uniquement si un enregistrement est sélectionné.
- **MobileDiscover** — [`MobileDiscover.dc.html`](../system/MobileDiscover.dc.html) : header simple + liste verticale de `RecordingRow` (gabarit vertical : PlayButton `sm` + titre/lieu au-dessus du waveform, plutôt que côte à côte comme sur desktop) + `BottomTabBar`.
- **MobileRecordingDetail** — [`MobileRecordingDetail.dc.html`](../system/MobileRecordingDetail.dc.html) : même contenu que le desktop en une seule colonne verticale, PlayButton `lg filled` (64px) centré — priorité absolue à un contrôle de lecture facilement atteignable au pouce.
- **MobileUpload** — [`MobileUpload.dc.html`](../system/MobileUpload.dc.html) : montre l'étape 1 (dropzone → "Tap to select a recording" puisqu'il n'y a pas de drag-and-drop tactile). Les étapes 2 et 3 reprennent le même `StepIndicator` compact et les mêmes composants `Input`/récapitulatif que le desktop, en pleine largeur colonne unique.
- **MobileProfile** — [`MobileProfile.dc.html`](../system/MobileProfile.dc.html) : bloc identité centré, liste `Row` (pas de grille 3 colonnes) pour les enregistrements, `BottomTabBar` avec l'avatar comme 4ᵉ repère visuel (Profil n'étant pas un onglet à part entière — voir §2.8).

---

## 4. Comportement responsive

| Breakpoint | Plage | Changements |
|---|---|---|
| Desktop | ≥ 1024px | Layouts tels que documentés en §3.1–3.6. Carte Explorer et panneaux flottants. Grille Profil 3 colonnes. |
| Tablette | 768–1023px | Colonnes centrées réduisent leur `max-width` proportionnellement. Grille Profil passe à 2 colonnes. Panneau flottant Explorer peut passer en pleine largeur ancrée en bas plutôt que flottant à gauche (à valider — non illustré dans les mockups, comportement mobile peut servir de référence dès 768px si le panneau devient trop large). |
| Mobile | < 768px | Bascule sur les gabarits mobile dédiés (§3.7) : `BottomSheet` remplace le panneau flottant, `BottomTabBar` remplace la nav header, listes verticales remplacent les grilles/rangées horizontales. |

Le header desktop (nav horizontale + tagline) ne doit **jamais** être compressé en menu hamburger — en dessous de 768px, il est remplacé par le header mobile minimal (wordmark + avatar) documenté en §3.7, pas adapté en accordéon.

---

## 5. États transverses

| État | Traitement |
|---|---|
| **Chargement de contenu** (feed, résultats de recherche, profil) | Squelettes discrets : rectangles `background: var(--line-hairline)` aux dimensions du contenu final (titre, ligne de méta, waveform), `opacity` pulsant doucement (respecter `prefers-reduced-motion`, voir §6). Pas de spinner central plein écran sauf chargement initial de l'app. |
| **Erreur réseau** | Message texte simple + action "Réessayer" en `Button secondary`. Pas de modale bloquante pour une erreur de chargement de liste. |
| **Vide** | Voir chaque écran en §3 — toujours texte simple, jamais d'illustration/emoji, cohérent avec le ton documentaire du produit. |
| **Offline / son indisponible** | PlayButton passe en `disabled` visuel (`opacity: 0.35`), message discret sous le waveform. |

---

## 6. Animation / Motion

Principe : **mouvement minimal, jamais permanent.** Aucune animation ne boucle indéfiniment sauf l'état `loading` du PlayButton (et même celui-ci doit s'arrêter dès que le son est prêt).

| Élément | Déclencheur | Animation | Durée | Easing |
|---|---|---|---|---|
| Panneau de sélection (Explorer) | Sélection d'un marqueur | Fade + léger déplacement vertical (8px) à l'apparition | 180ms | `ease-out` |
| BottomSheet (mobile) | Sélection d'un marqueur / fermeture | Translation verticale depuis/vers le bas | 220ms | `cubic-bezier(0.32, 0.72, 0, 1)` (courbe "sheet" standard iOS-like) |
| PlayButton | play ↔ pause | Cross-fade entre triangle et barres, pas de rotation/rebond | 120ms | `ease-in-out` |
| Nav item / lien | Changement d'état actif/hover | Transition `color` uniquement | 150ms | `ease` |
| Apparition de contenu (listes au chargement) | Montée de page / fin de chargement | Fade simple, éventuellement + 4px de translation verticale | 200ms, décalage en cascade ≤ 40ms entre items si liste courte (< 6 items) | `ease-out` |
| Marqueur carte : default → selected | Sélection | Transition `stroke`/`fill` + scale léger (1 → 1.08 → 1) | 200ms | `ease-out` |

**`prefers-reduced-motion: reduce`** : toutes les transitions ci-dessus doivent tomber à une durée quasi nulle (≤ 1ms, changement d'état instantané) — aucune translation, aucun scale, aucun cross-fade. Implémenter via une media query globale plutôt que composant par composant :

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 7. Accessibilité (AA minimum)

- **Contraste** : `--color-ink` (#201E1B) sur `--color-paper` (#FAFAF8) ≈ 15.8:1 — largement AA/AAA. `--color-stone` (#8D8A85) sur `--color-paper` ≈ 3.9:1 — **suffisant pour du texte ≥ 18px ou du texte gras ≥ 14px, insuffisant pour du texte normal plus petit** : vérifier au cas par cas que `--color-stone` n'est jamais utilisé seul pour du texte informatif critique en dessous de 14px sans renfort (les micro-labels à 10-11px en `--color-stone` sont látolérés car décoratifs/redondants avec le contexte, mais tout texte porteur d'information unique doit rester en `--color-ink` ou `--color-ink-secondary`). `--color-accent` (#33513E) sur `--color-paper` ≈ 7.2:1 — conforme.
- **Navigation clavier** : ordre de tabulation = ordre visuel (header → contenu principal → panneau flottant si présent). Le panneau de sélection Explorer doit être atteignable au clavier une fois un marqueur sélectionné (`tabindex` géré dynamiquement, pas de piège de focus).
- **Focus visible** : `outline: 1px solid var(--color-ink); outline-offset: 3px` sur tout élément interactif — jamais `outline: none` sans remplacement.
- **Cibles tactiles** : 44×44px minimum pour tout élément interactif sur mobile (voir notes par composant en §2).
- **ARIA carte** : la carte interactive doit exposer un moyen non-visuel de parcourir les enregistrements (ex. la bande "Selected"/liste éditoriale sous la carte sert aussi de fallback accessible — s'assurer qu'elle reste dans le DOM et navigable même si elle est visuellement secondaire).
- **Lecteur audio** : `PlayButton` a un `aria-label` dynamique ("Play {title}" / "Pause {title}"), `aria-pressed` reflète l'état. Le composant `Waveform` est `aria-hidden` sauf s'il est rendu interactif comme slider (voir §2.3).
- **Labels de formulaire** (flux Ajouter) : chaque `Input`/`Textarea` a un `<label>` associé explicitement (`for`/`id`), pas seulement un texte visuel à proximité.
- **Alt text photographie** : si des photographies documentaires sont ajoutées ultérieurement à une fiche (non présentes dans le MVP actuel), prévoir un texte alternatif descriptif, jamais vide, jamais générique ("photo").

---

## 8. Ce qui n'est pas encore spécifié

À trancher avec le produit/design avant implémentation si le besoin se présente :
- État `expanded` de la BottomSheet mobile (au-delà du peek actuel).
- Comportement exact du panneau Explorer en tablette (768–1023px).
- UI de filtres avancés sur Recherche si elle dépasse 3 filtres simples.
- Mode sombre (non demandé pour ce MVP).
- Pagination/infinite scroll exact sur Discover et Search.
- Taille maximale de fichier à l'upload et gestion des formats refusés côté serveur.

---

*Document généré à partir du système de design "Quiet Cartography" — voir [`design/system/DesignSystem.dc.html`](../system/DesignSystem.dc.html) pour la fiche de référence visuelle et le canvas publié pour l'ensemble des écrans à l'échelle.*

# 8. Données et recherche

## 8.1 Schéma PostgreSQL/PostGIS (esquisse)

```
users                      -- voir 06-authentification-sans-mot-de-passe.md
webauthn_credentials
recovery_codes

recordings
├── id: uuid
├── author_id: fk users
├── title: text
├── description: text | null
├── location_label: text            -- "Lieu, Pays" affiché
├── location_point: geography(Point, 4326)  -- PostGIS, pour les requêtes de proximité
├── recorded_at: date
├── duration_seconds: integer
├── tags: text[]
├── license: text                   -- CC0 | CC-BY | CC-BY-SA | CC-BY-NC
├── status: text                    -- draft | processing | published | failed
├── original_url: text              -- Object Storage, copie pérenne en mode intérimaire (voir 05.10)
├── streaming_url: text
├── ia_identifier: text | null       -- null tant qu'Internet Archive n'est pas actif (voir 05.10)
├── ia_item_url: text | null
├── waveform_peaks: jsonb
├── equipment: text | null
├── sample_rate: text | null
├── format: text | null
├── created_at: timestamp
└── updated_at: timestamp

CREATE INDEX recordings_location_gix ON recordings USING GIST (location_point);
```

L'index **GIST** sur `location_point` permet des requêtes de type « enregistrements dans le viewport actuel de la carte » (`ST_MakeEnvelope` + `&&`) et « enregistrements proches de ce point » (`ST_DWithin`) avec de bonnes performances même à plusieurs dizaines de milliers d'enregistrements.

## 8.2 Chargement des marqueurs sur la carte (Explorer)

1. Le client envoie le viewport courant (bounding box + niveau de zoom) à l'API.
2. L'API filtre en base via `ST_MakeEnvelope` + index GIST, limite le nombre de résultats retournés (ex. 500 max), ne renvoie que les champs nécessaires au marqueur (id, coordonnées, titre — pas la waveform complète).
3. Le **clustering visuel** (variante `cluster` du `MapMarker`, §2.4 du handoff) est calculé **côté client** avec Supercluster à partir des points déjà chargés — évite un aller-retour serveur à chaque micro-déplacement de la carte, cohérent avec le seuil de clustering "à définir avec la librairie carto" mentionné dans le handoff.
4. Au clic sur un marqueur, une requête ciblée récupère le détail complet (waveform, tags, etc.) pour peupler le panneau/bottom sheet.

## 8.3 Recherche (Meilisearch)

- Un **index unique** `recordings`, synchronisé par le worker à chaque passage de `status` à `published` (et à chaque mise à jour de métadonnées).
- Champs indexés : `title`, `description`, `tags`, `location_label`.
- Attributs filtrables/facettables : `tags`, `location_label`, `duration_seconds` (par tranches), `license`.
- Tolérance aux fautes de frappe native (utile pour des noms d'espèces ou de lieux mal orthographiés).
- Debounce de 250-300ms côté client avant requête, comme recommandé au §3.6 du handoff.

## 8.4 État "vide"/"en cours" pris en compte dès le schéma

Le champ `status` (introduit en [05](05-stockage-audio-internet-archive.md#58-modèle-de-données-ajouts)) évite qu'un enregistrement en cours d'archivage IA n'apparaisse dans la recherche ou sur la carte avant d'être réellement lisible — l'indexation Meilisearch et le géo-index PostGIS ne prennent en compte que `status = 'published'` (filtre systématique côté requêtes publiques).

## 8.5 À trancher

- Seuil exact de résultats retournés par requête viewport (dépend du volume réel de données une fois la communauté active).
- Faut-il un champ `visibility` séparé de `status` pour un futur mode "brouillon privé volontaire" (hors scope MVP actuel, le brief produit ne le mentionne pas).

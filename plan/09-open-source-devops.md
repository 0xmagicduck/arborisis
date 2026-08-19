# 9. Open source & DevOps

## 9.1 Licence

| Périmètre | Licence recommandée | Pourquoi |
|---|---|---|
| Code applicatif (`apps/`, `packages/`) | **AGPL-3.0** | Empêche un tiers de forker le projet, l'opérer commercialement en SaaS fermé et ne jamais republier ses modifications — cohérent avec l'esprit "commun" du projet. Contrepartie assumée : freine potentiellement certaines contributions d'entreprises allergiques à l'AGPL, jugé acceptable ici. |
| Contenu utilisateur (enregistrements) | Choix du contributeur parmi CC0 / CC-BY / CC-BY-SA / CC-BY-NC | Imposé de fait par l'hébergement sur Internet Archive, voir [05](05-stockage-audio-internet-archive.md#55-licence--condition-dhébergement-pas-juste-une-option-ui) |
| Documentation (`plan/`, `design/`) | **CC-BY-SA 4.0** | Cohérent avec l'esprit ouvert, permet réutilisation avec attribution |

## 9.2 Structure du dépôt GitHub

```
arborisis/
├── apps/ packages/ infra/ plan/ design/   -- voir 03-stack-technique.md
├── .github/
│   ├── workflows/            -- CI/CD (lint, test, build, déploiement)
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md               -- procédure de signalement de vulnérabilité
├── LICENSE                    -- AGPL-3.0
└── README.md
```

- **Dépôt public dès le début** (le principe d'ouverture n'a pas de sens en dépôt privé qui s'ouvrirait "plus tard").
- **Branche `main` protégée** : review obligatoire avant merge, CI verte obligatoire.
- **`SECURITY.md`** important vu le sujet auth/WebAuthn : canal de signalement responsable (ex. adresse de contact dédiée, hors auth) avant divulgation publique d'une faille.

## 9.3 CI/CD (GitHub Actions)

| Workflow | Déclencheur | Étapes |
|---|---|---|
| `ci.yml` | chaque push/PR | install → lint (ESLint) → typecheck → tests unitaires (Vitest) → build |
| `e2e.yml` | PR vers `main` | Playwright (upload, auth WebAuthn simulée, navigation carte) |
| `docker-publish.yml` | merge sur `main` | build des images `web`/`api`/`worker` → push vers `ghcr.io/arborisis/*` |
| `deploy.yml` | tag de release (ou merge `main` selon la cadence choisie) | SSH vers la VM Infomaniak → `docker compose pull && up -d` → vérification santé (`/health`) |
| `dependabot`/`renovate` | hebdomadaire | mises à jour de dépendances automatiques, PR séparée |

## 9.4 Secrets

- Secrets de déploiement (clé SSH, credentials Object Storage, clé API Internet Archive) stockés dans **GitHub Actions Secrets**, jamais commités.
- `.env` sur le serveur, non versionné, généré/synchronisé manuellement ou via un outil de secrets chiffrés (ex. SOPS + age) si le besoin de traçabilité augmente.

## 9.5 Gouvernance de contribution

- `CONTRIBUTING.md` doit couvrir : comment lancer le projet en local (`docker compose up` avec des services mockés/légers pour ne pas dépendre d'un vrai compte Internet Archive en dev), convention de commits, processus de review.
- Étiquettes d'issues type `good first issue` pour faciliter l'entrée de nouveaux contributeurs, cohérent avec l'objectif open source affiché.

## 9.6 À trancher

- Cadence de déploiement (à chaque merge sur `main` vs tags de release explicites) — recommandation par défaut : tags de release pour garder un contrôle manuel au démarrage, automatiser davantage une fois la confiance dans la CI établie.
- Nom d'organisation GitHub (`arborisis` à vérifier de disponibilité).

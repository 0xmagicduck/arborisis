# 10. Sécurité, confidentialité, conformité

## 10.1 Modèle de menace (résumé)

Arborisis est une plateforme de contenu public (les enregistrements sont, par construction, destinés à être publics et archivés). Le risque principal n'est donc pas la confidentialité du contenu, mais :

1. **Prise de contrôle de compte** — mitigée à la racine par WebAuthn (voir [06](06-authentification-sans-mot-de-passe.md)) : pas de mot de passe à voler, pas de phishing efficace possible (credential lié à l'origine).
2. **Abus de contenu** (upload de contenu illégal/offensant/hors sujet) — nécessite une politique de modération, voir §10.3.
3. **Disponibilité** (DDoS, pic de charge) — mitigée par la sobriété de l'archi (§4) et une trajectoire de scaling documentée, pas par une dépendance préventive à un tiers commercial.
4. **Vulnérabilités de dépendances** — mitigées par Dependabot/Renovate + `pnpm audit` en CI (§9.3).

## 10.2 Minimisation des données

| Donnée | Collectée ? | Où |
|---|---|---|
| Email | **Non, jamais** | — |
| Mot de passe | **Non, jamais** | — |
| Pseudo, bio (optionnelle) | Oui, choisie par l'utilisateur | PostgreSQL |
| Clé publique WebAuthn | Oui (nécessaire à l'auth) | PostgreSQL, pas de secret exploitable seul |
| Géolocalisation d'un **enregistrement** | Oui (cœur du produit) | PostgreSQL, publique par nature |
| Géolocalisation de l'**utilisateur** (position GPS live) | Non — seule la localisation du son est pertinente, pas celle de la personne qui consulte l'app | — |
| Logs serveur (IP, user-agent) | Oui, minimal, durée de rétention courte (ex. 30 jours) | Infomaniak, pas transmis à un tiers analytics |
| Cookies | Uniquement le cookie de session (strictement nécessaire) | — pas de bannière de consentement requise puisqu'aucun cookie non essentiel |
| Analytics | Optionnel, si ajouté : solution auto-hébergée et anonymisée (ex. Plausible/Umami), jamais Google Analytics | — |

## 10.3 Modération

Le contenu publié devient rapidement public et archivé de façon quasi permanente sur Internet Archive (voir [05](05-stockage-audio-internet-archive.md#57-suppression-et-modération)) — la modération doit donc intervenir **avant** la publication effective plutôt qu'après :

- Un mécanisme de **signalement** (report) doit exister dès le MVP+1, même minimal (bouton "Signaler" sur RecordingDetail → file d'attente admin).
- À très petite échelle, une revue manuelle légère avant le push vers Internet Archive est envisageable (file d'attente courte, latence acceptable vu le ton "archive, pas temps réel" du produit). À automatiser/alléger si le volume grandit.
- Politique de contenu à écrire (CGU) : ce qui est accepté (sons naturalistes/de terrain) vs refusé.

## 10.4 Sauvegardes et continuité

- RPO (perte de données maximale acceptable) cible : 24h (dump nocturne, voir [04](04-infra-infomaniak.md#45-sauvegardes)).
- RTO (temps de restauration) cible : quelques heures, acceptable vu la nature non-transactionnelle du produit (pas de paiement, pas d'urgence business).
- **Test de restauration** à planifier trimestriellement une fois en production : restaurer un dump sur un environnement de test et vérifier l'intégrité.
- Le contenu audio original reste de toute façon récupérable depuis Internet Archive même en cas de perte totale de l'infra Infomaniak — filet de sécurité structurel, pas seulement opérationnel.

## 10.5 Conformité RGPD / nLPD

- Hébergement en Suisse (Infomaniak) → soumis à la **nLPD** (nouvelle loi suisse sur la protection des données) ; application accessible aux résidents UE → **RGPD** applicable également pour ces utilisateurs.
- La minimisation de données (§10.2) réduit fortement la surface de conformité : pas d'email = pas de donnée de contact directe à protéger contre le spam/phishing, pas de mot de passe = pas de risque de fuite de credential.
- Droits RGPD à implémenter malgré tout : export des données du compte (profil + liste de ses enregistrements), suppression de compte (avec la nuance Internet Archive documentée en [05.7](05-stockage-audio-internet-archive.md#57-suppression-et-modération)).
- Politique de confidentialité et CGU à rédiger avant le lancement public, mentionnant explicitement : absence de collecte d'email, nature publique/permanente du contenu publié, rôle d'Internet Archive comme tiers hébergeur du contenu original.

## 10.6 À trancher

- Seuil à partir duquel une revue manuelle avant publication devient intenable (volume d'uploads/jour) et bascule vers un modèle "publication immédiate + modération a posteriori sur signalement".
- Portée exacte du droit à l'export/suppression vis-à-vis du contenu déjà archivé sur Internet Archive — probablement à faire valider par un avis juridique léger avant le lancement public.

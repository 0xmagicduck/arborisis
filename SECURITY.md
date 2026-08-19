# Politique de sécurité

## Signaler une vulnérabilité

Arborisis repose sur une authentification sans mot de passe (WebAuthn/passkeys, voir [plan/06-authentification-sans-mot-de-passe.md](plan/06-authentification-sans-mot-de-passe.md)) : la sécurité de ce composant est critique.

**Merci de ne jamais ouvrir d'issue publique pour une faille de sécurité.**

À la place :

- Contact dédié : `security@arborisis.com` *(à activer une fois le domaine et l'hébergement mail provisionnés — voir [plan/04-infra-infomaniak.md §4.4](plan/04-infra-infomaniak.md#44-domaine-arborisiscom))*
- En attendant l'activation de cette adresse, utiliser l'onglet **Security Advisories** du dépôt GitHub (`Security` → `Report a vulnerability`), qui permet une divulgation privée sans passer par une adresse e-mail publique.

Merci d'inclure :

- Une description du problème et de son impact potentiel
- Les étapes de reproduction (PoC si possible)
- La version/commit concerné

## Délai de réponse

Objectif : accusé de réception sous 72h, évaluation initiale sous 7 jours. Le projet étant en phase de bootstrap (voir [plan/11-roadmap.md](plan/11-roadmap.md)), ces délais seront resserrés une fois une équipe de mainteneurs constituée.

## Divulgation coordonnée

Nous demandons un délai raisonnable avant toute divulgation publique, le temps qu'un correctif soit développé, testé et déployé.

## Portée

Sont concernés : le code applicatif de ce dépôt (`apps/`, `packages/`, `infra/`). Les vulnérabilités dans des dépendances tierces doivent être signalées directement à leurs mainteneurs respectifs (ou via `npm audit` / Dependabot pour ce dépôt).

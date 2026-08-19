# 6. Authentification sans email/mot de passe (WebAuthn)

## 6.1 Principe

Aucun email, aucun mot de passe nulle part dans le système — ni en base, ni en transit. L'authentification repose entièrement sur **WebAuthn** (standard W3C/FIDO2), qui couvre nativement deux familles d'authentificateurs, sans distinction de code côté serveur :

- **Passkeys synchronisées** (Face ID/Touch ID via trousseau iCloud, Windows Hello, gestionnaire de mots de passe Google/Android) — l'équivalent de « style iCloud » évoqué dans la demande.
- **Clés d'accès physiques** (YubiKey, Titan Security Key, Solo Key…) via USB, NFC ou Bluetooth.

Ce choix supprime à la racine le phishing de mot de passe, le credential stuffing et les fuites de base de mots de passe : il n'y a simplement rien de ce type à voler. WebAuthn est **lié à l'origine** (`arborisis.com`) — une fausse page ne peut pas obtenir de credential valide même si l'utilisateur se fait piéger.

## 6.2 Flux d'inscription

1. L'utilisateur choisit un **pseudo unique** (identifiant public, pas d'email).
2. Cérémonie WebAuthn `navigator.credentials.create()` → le navigateur invite à utiliser le biométrique de l'appareil ou une clé physique.
3. Le serveur stocke la clé publique du credential (jamais de secret partagé).
4. **10 codes de récupération à usage unique** sont générés et affichés une seule fois, à sauvegarder par l'utilisateur (impression, gestionnaire de mots de passe).
5. L'UI encourage (sans bloquer) l'enregistrement d'un **second authentificateur** dès l'inscription (ex. passkey téléphone + clé physique de secours) — c'est la meilleure protection contre la perte d'accès.

## 6.3 Flux de connexion

1. Saisie du pseudo (ou détection automatique via `autocomplete="webauthn"` / conditional UI si le navigateur le permet, sans même taper le pseudo).
2. Cérémonie WebAuthn `navigator.credentials.get()` → biométrique/PIN/tap sur la clé.
3. Le serveur vérifie la signature contre la clé publique stockée, incrémente le compteur anti-clonage (`sign_count`), émet une session.

Le flux « connexion cross-device » (scanner un QR code depuis son téléphone pour se connecter sur un ordinateur qui n'a pas de passkey enregistrée) fonctionne nativement via le transport **hybrid** de WebAuthn dans les navigateurs récents — rien à développer spécifiquement, juste ne pas le désactiver.

## 6.4 Modèle de données

```
users
├── id: uuid
├── handle: string (unique, public)
├── display_name: string | null
├── bio: string | null
├── created_at: timestamp
-- pas de colonne email, pas de colonne password

webauthn_credentials
├── id: uuid
├── user_id: fk users
├── credential_id: bytea (unique)
├── public_key: bytea
├── sign_count: integer
├── transports: string[]        -- 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid'
├── device_label: string        -- ex. "iPhone de Bastien", "YubiKey"
└── created_at: timestamp

recovery_codes
├── id: uuid
├── user_id: fk users
├── code_hash: string           -- haché (argon2), jamais stocké en clair
├── used_at: timestamp | null
└── created_at: timestamp
```

## 6.5 Session

- Après cérémonie réussie : cookie de session `httpOnly`, `Secure`, `SameSite=Lax`, TTL court (ex. 7 jours glissants), stocké côté serveur dans Redis (révocable immédiatement — utile en cas de perte d'appareil).
- Protection CSRF sur toutes les routes de mutation (double-submit token ou vérification d'origine, en complément de `SameSite`).
- Limitation de débit (rate limiting) sur les routes d'inscription/connexion malgré l'absence de mot de passe à "bruteforcer" — protège contre l'énumération de pseudos et l'abus général.

## 6.6 Le vrai compromis : la récupération de compte

Sans email, il n'existe pas de "lien magique de réinitialisation". C'est un choix assumé (sécurité maximale) qui déplace la charge de récupération vers l'utilisateur et vers un processus de support minimal :

| Niveau | Méthode | Disponibilité |
|---|---|---|
| 1 | Un autre authentificateur déjà enregistré (autre appareil/clé) | si l'utilisateur en a enregistré ≥ 2, cas nominal |
| 2 | Code de récupération à usage unique | si sauvegardé à l'inscription |
| 3 | Processus de support manuel, documenté publiquement, à froid | dernier recours, rare, pas automatisable sans réintroduire une faille (c'est le compromis assumé) |

Le niveau 3 doit être écrit noir sur blanc dans les CGU/FAQ : en l'absence d'un second facteur et de codes de récupération, la perte de l'unique authentificateur peut signifier une perte d'accès définitive au compte (pas aux enregistrements déjà publiés, qui restent sur Internet Archive et visibles publiquement — seul le contrôle du profil est perdu). C'est explicite, pas caché.

## 6.7 À trancher

- Faut-il rendre l'enregistrement d'un deuxième authentificateur **obligatoire** (pas seulement encouragé) avant de pouvoir publier un enregistrement ? Renforce la récupération de compte au prix d'un peu de friction à l'inscription.
- Faut-il proposer, en option strictement séparée de l'authentification, une adresse de contact pour le support (pas pour se connecter) ? Ne remet pas en cause le principe "sans email pour l'auth".

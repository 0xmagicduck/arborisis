# Photon auto-hébergé — géocodage (Phase 5)

Sort du mode bootstrap documenté en
[plan/07-carte-open-source.md §7.4](../../plan/07-carte-open-source.md#74-bootstrap-vs-auto-hébergement-complet) :
l'instance publique de démonstration Photon (komoot) reste le défaut en dev
(`PHOTON_URL` non défini, voir `.env.example`), mais la production utilise une
instance auto-hébergée avec l'**index planète complet**.

## Ressources provisionnées (2026-08-20)

Provisionnées **manuellement via `openstack` CLI**, pas encore par Terraform
(voir « Dette IaC » ci-dessous) :

| Ressource | Détail |
|---|---|
| VM `arborisis-photon-1` | flavor `a8-ram32-disk20-perf1` (8 vCPU / 32 Go RAM / 20 Go disque racine) — **dédiée**, séparée de `arborisis-app-1` (la VM de prod applicative) |
| Volume Cinder `arborisis-photon-data` | 300 Go (`CEPH_1_perf1`), monté sur `/mnt/photon-data`, `LABEL=photon-data` dans `/etc/fstab` |
| Réseau | même réseau privé `arborisis-net` que `arborisis-app-1` (192.168.120.0/24) — IP privée `192.168.120.209` |
| Groupe de sécurité `arborisis-photon-sg` | SSH (22) restreint à la même IP que `arborisis-sg`, port 2322 restreint à `192.168.120.0/24` (réseau privé uniquement — **aucune exposition publique**) |
| IP flottante | attribuée temporairement pour la mise en place SSH initiale ; à détacher une fois l'exploitation confiée à un outil de gestion de flotte, ou à garder si l'administration SSH ponctuelle reste utile (coût marginal d'une IP flottante inutilisée à vérifier) |

## Pourquoi une VM séparée, pas la VM de prod

La documentation officielle de Photon recommande **64 Go de RAM minimum**
pour l'index planète (32 Go choisi ici comme compromis coût/marge de
sécurité, voir décision utilisateur consignée dans `plan/TASKS.md`). La VM de
prod (`arborisis-app-1`) n'a que 8 Go de RAM, partagés avec Postgres/Redis/
Meilisearch/API/worker/web — y faire tourner l'index planète aurait risqué de
faire OOM-killer d'autres services et de faire tomber le site en production.

## Pourquoi pas d'IP publique sur le port 2322

L'API HTTP de Photon est en lecture seule (recherche) mais **non
authentifiée** — l'exposer directement à Internet en ferait un service public
gratuit exploitable par n'importe qui (coût de calcul/bande passante). Le
navigateur n'appelle donc plus Photon directement (contrairement au bootstrap
Phase 4) : `apps/api` proxifie via `GET /geocode` (voir
`apps/api/src/routes/geocode.ts`), atteignant Photon uniquement via le réseau
privé. Voir `apps/web/lib/geocoding.ts` pour le changement côté client.

## Déploiement de l'index

Index planète complet téléchargé depuis la publication officielle komoot
(`photon-db-planet-1.0-latest.tar.bz2`, ~58 Go compressé, ~90 Go extrait) —
pas généré nous-mêmes (contrairement au `.pmtiles`, voir `infra/tiles/`) :
Photon 1.3.0 (voir `photon-1.3.0.jar` sur la VM) utilise un moteur OpenSearch
interne dont la construction depuis zéro nécessiterait une base Nominatim
PostgreSQL complète — hors de portée raisonnable ici, le dump pré-construit
est la voie recommandée par le projet lui-même.

```bash
cd /mnt/photon-data
wget -O - https://download1.graphhopper.com/public/photon-db-planet-1.0-latest.tar.bz2 | pbzip2 -cd | tar x
```

## Service systemd

```ini
# /etc/systemd/system/photon.service
[Unit]
Description=Photon geocoding server (Arborisis, auto-hebergement Phase 5)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/mnt/photon-data
ExecStart=/usr/bin/java -Xmx20g -jar /mnt/photon-data/photon-1.3.0.jar serve -listen-ip 0.0.0.0 -listen-port 2322 -j 4 -cors-any
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

`-Xmx20g` sur 32 Go de RAM totale : laisse de la marge au système et au cache
disque (l'index de 90 Go ne tient pas en RAM, une partie repose sur le cache
disque géré par l'OS). `-cors-any` sans effet réel ici (plus personne
n'appelle Photon depuis un navigateur), gardé pour un éventuel usage direct
en debug plutôt que retiré.

`systemctl enable --now photon.service` — redémarre automatiquement au boot
et sur crash (`Restart=on-failure`).

## Configuration `apps/api`

```bash
PHOTON_URL=http://192.168.120.209:2322/api
```

À définir uniquement sur la VM de prod (`arborisis-app-1`) une fois l'API qui
y tourne réellement déployée (Phase 6) — l'IP privée n'est routable que
depuis le même réseau `arborisis-net`.

## Vérifié en conditions réelles (2026-08-20)

- `curl http://localhost:2322/api?q=Paris&limit=1` et `q=Tokyo` exécutés
  directement sur `arborisis-photon-1` après démarrage du service — résultats
  réels retournés (couverture planétaire confirmée, pas seulement une zone
  d'extrait comme pour le `.pmtiles` Luxembourg).
- **Depuis `arborisis-app-1` (la VM de prod applicative) vers
  `192.168.120.209:2322`** via le réseau privé — requête réelle aboutie,
  confirmant le chemin réseau qu'empruntera `apps/api` en production une fois
  déployé (Phase 6).
- Requête `GET /geocode` (le proxy API) vérifiée depuis un navigateur réel,
  contre l'instance bootstrap publique en dev — le comportement du proxy
  lui-même est indépendant de l'instance Photon ciblée.

**Bug réel trouvé et corrigé pendant cette vérification** : la première
tentative depuis `arborisis-app-1` timeout silencieusement malgré un groupe
de sécurité OpenStack (Neutron) correctement configuré — cause réelle :
`ufw` (pare-feu hôte, activé par le `cloud-init.yaml` réutilisé pour cette
VM) n'ouvre par défaut que 22/80/443, pas 2322. Deux couches de pare-feu
indépendantes (Neutron + `ufw`), la seconde oubliée. Corrigé avec
`ufw allow from 192.168.120.0/24 to any port 2322 proto tcp` — et les règles
80/443 inutiles retirées (cette VM ne sert aucun site). Voir `plan/MEMORY.md`.

## Dette IaC

Ces ressources sont créées via `openstack` CLI directement, pas via
Terraform (`infra/terraform/main.tf` ne les référence pas) — même
pragmatisme que les credentials EC2 en Phase 2 (voir `plan/MEMORY.md`). À
importer dans l'état Terraform (`terraform import`) si/quand ce projet migre
vers un backend Terraform distant partagé entre sessions (voir la note dans
`infra/terraform/versions.tf`) — pas fait ici faute d'état Terraform local
disponible dans ce worktree pour un `apply` sûr.

## Coût

VM `a8-ram32-disk20-perf1` + volume 300 Go : coût mensuel réel à vérifier
dans le Manager Infomaniak (non confirmé précisément au moment de la
rédaction, voir l'échange avec l'utilisateur dans `plan/TASKS.md` — estimation
de départ 20-35 €/mois pour le seul volume, VM non incluse dans cette
estimation initiale).

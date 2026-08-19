# 4. Infrastructure — Infomaniak Public Cloud

## 4.1 Pourquoi Infomaniak

- Hébergeur suisse, énergie renouvelable, ne revend/n'exploite pas les données clients — cohérent avec les principes de [01-vision-et-principes.md](01-vision-et-principes.md).
- **Infomaniak Public Cloud** est basé sur **OpenStack** : compute (VMs), Object Storage (compatible API S3), block storage, réseau privé, load balancer — standards ouverts, pas de SDK propriétaire imposé.
- Registrar de domaine et hébergement mail disponibles chez le même acteur si besoin (utile pour `arborisis.com`, voir §4.4).

## 4.2 Ressources nécessaires pour le MVP

| Ressource | Dimensionnement de départ | Usage |
|---|---|---|
| 1 instance Compute | 4 vCPU / 8 Go RAM / 80 Go SSD (ajuster après mesure réelle) | Docker Compose : Caddy, Web, API, Worker, PostgreSQL, Redis, Meilisearch |
| 1 bucket Object Storage | quelques Go au départ, facturé à l'usage | staging d'upload, proxy audio transcodé, tuiles PMTiles, backups DB |
| 1 IP publique flottante | — | attachée à la VM, pointée par le DNS |
| Snapshots de volume | hebdomadaires | filet de sécurité en plus des backups applicatifs (§4.5) |

Pas de base de données managée ni de Kubernetes au démarrage — voir §4.6 pour la trajectoire de montée en charge.

## 4.3 Provisioning

- **Infrastructure as code** : Terraform avec le provider `terraform-provider-openstack` (Infomaniak Public Cloud expose une API OpenStack standard, compatible). Le repo garde donc `infra/terraform/` versionné : instance, IP flottante, groupe de sécurité (règles firewall : 80/443 ouverts, 22 restreint à des IPs connues ou à un bastion), bucket Object Storage.
- **Configuration serveur** : un script d'installation minimal (cloud-init ou Ansible léger) installe Docker + Docker Compose au premier boot, rien de plus manuel.
- **Déploiement applicatif** : GitHub Actions build les images, les publie sur GitHub Container Registry (ghcr.io), puis se connecte en SSH à la VM pour `docker compose pull && docker compose up -d`. Voir [09-open-source-devops.md](09-open-source-devops.md).

## 4.4 Domaine arborisis.com

| Enregistrement | Valeur | Note |
|---|---|---|
| `A` / `AAAA` (apex) | IP flottante de la VM | site principal |
| `CNAME www` | `arborisis.com` | redirection vers l'apex |
| `MX` | **aucun** | pas de boîte mail nécessaire pour l'auth (sans email) |
| `TXT` contact/legal | optionnel | si une adresse de contact `contact@arborisis.com` est créée séparément pour le support/la modération (hébergement mail Infomaniak à part, sans lien avec l'authentification des comptes) |
| `CAA` | `letsencrypt.org` | restreint les autorités de certification autorisées à émettre un certificat pour le domaine |

Zone DNS gérée directement chez Infomaniak si le domaine y est enregistré (simplifie la gestion, un seul acteur), sinon chez le registrar existant en pointant vers l'IP de la VM.

## 4.5 Sauvegardes

- **PostgreSQL** : `pg_dump` nocturne (cron dans le conteneur ou sur l'hôte) → chiffré → poussé vers le bucket Object Storage, rétention 30 jours glissants + 12 mensuelles.
- **Volumes Docker** (Redis, Meilisearch) : reconstruction possible depuis PostgreSQL (source de vérité), pas de sauvegarde stricte nécessaire — Meilisearch se ré-indexe depuis la base.
- **Audio** : voir [05-stockage-audio-internet-archive.md](05-stockage-audio-internet-archive.md) — la copie de référence pérenne est sur Internet Archive, pas sur l'infra Infomaniak.
- **Snapshots de volume Infomaniak** : filet de sécurité supplémentaire au niveau infrastructure, hebdomadaire.
- Un test de restauration (restore drill) doit être planifié régulièrement — voir [10-securite-confidentialite-conformite.md](10-securite-confidentialite-conformite.md#104-sauvegardes-et-continuité).

## 4.6 Trajectoire de montée en charge

1. **MVP (actuel)** : 1 VM, Docker Compose, tout colocalisé.
2. **Si la disponibilité devient critique** : séparer PostgreSQL sur son propre volume/instance (ou base managée Infomaniak si elle supporte l'extension PostGIS — à vérifier avec le support Infomaniak au moment venu), ajouter une deuxième VM applicative derrière un load balancer Infomaniak.
3. **Si le trafic devient significatif** : migrer vers **Infomaniak Kubernetes Engine**, en réutilisant les mêmes images Docker (aucune réécriture applicative), avec autoscaling horizontal sur l'API/worker.

Chaque étape n'est déclenchée que par une métrique réelle (latence, CPU soutenu, incidents de disponibilité), jamais par anticipation — cohérent avec le principe de sobriété opérationnelle.

## 4.7 À trancher

- Dimensionnement exact de la VM de départ (budget mensuel à définir).
- Faut-il un reverse-proxy/CDN externe (ex. Cloudflare gratuit) devant Caddy pour absorber un pic de trafic/DDoS ? Recommandation par défaut : **non au démarrage** (cohérent avec le principe « pas de dépendance à un tiers commercial hors nécessité »), à réévaluer si un incident concret le justifie. Infomaniak propose ses propres protections réseau à vérifier auprès du support.

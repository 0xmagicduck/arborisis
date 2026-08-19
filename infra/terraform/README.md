# Terraform — Infomaniak Public Cloud

Provisionne la VM + réseau + Object Storage décrits dans [../../plan/04-infra-infomaniak.md](../../plan/04-infra-infomaniak.md).

**⚠️ Pas encore appliqué.** Ce squelette est prêt mais `terraform apply` n'a pas été lancé — la création de VM est une ressource facturée, à faire consciemment (voir [plan/TASKS.md](../../plan/TASKS.md)).

**Compte cloud partagé.** Le projet OpenStack `PCP-RYAEXPT` a servi à d'autres usages par le passé (9 VM `github-runner-*` supprimées le 2026-08-19, voir journal dans [plan/TASKS.md](../../plan/TASKS.md)). Toutes les ressources ci-dessous sont isolées sous un réseau et des groupes de sécurité dédiés (préfixe `arborisis-`) pour rester repérables si le compte est réutilisé ailleurs.

## Prérequis

1. Installer Terraform (`brew install terraform`, non présent sur cette machine au moment de l'écriture).
2. Identifiants OpenStack déjà configurés en local dans `~/.config/openstack/clouds.yaml` (jamais dans ce repo — voir `.gitignore`).
3. Choisir le cloud/région via la variable d'environnement, par ex. :
   ```bash
   export OS_CLOUD=PCP-RYAEXPT-dc3-a
   ```
4. Une clé publique SSH à fournir via `TF_VAR_ssh_public_key` ou `terraform.tfvars` (copier `terraform.tfvars.example`).

## Ressources créées

| Ressource | Détail |
|---|---|
| Réseau privé + sous-réseau + routeur | `arborisis-net`, isolé du réseau des runners existants |
| 1 instance Compute | flavor `a4-ram8-disk80-perf1` (4 vCPU / 8 Go RAM / 80 Go SSD) — dimensionnement de départ documenté en [04.2](../../plan/04-infra-infomaniak.md#42-ressources-nécessaires-pour-le-mvp) |
| Image | Ubuntu 24.04 LTS (disponible sur le catalogue Infomaniak) |
| 1 IP flottante | pool `ext-floating1` |
| Groupe de sécurité | 22 (SSH, restreint à `var.ssh_allowed_cidr`), 80 + 443 ouverts |
| 1 container Object Storage | `arborisis-storage` (Swift, compatible API S3) |
| cloud-init | installe Docker + Docker Compose au premier boot (voir `cloud-init.yaml`) |

## Utilisation (quand la VM sera nécessaire)

```bash
cd infra/terraform
export OS_CLOUD=PCP-RYAEXPT-dc3-a
cp terraform.tfvars.example terraform.tfvars   # renseigner ssh_public_key
terraform init
terraform plan     # relire attentivement avant d'appliquer
terraform apply
```

## À trancher avant apply (voir plan/TASKS.md)

- Région définitive : `dc3-a` (défaut ici) vs `dc4-a`.
- Restreindre `ssh_allowed_cidr` à une IP/plage connue plutôt que `0.0.0.0/0` (valeur par défaut volontairement absente — à fournir explicitement).

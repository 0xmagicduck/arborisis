variable "os_cloud" {
  description = "Nom de l'entrée dans ~/.config/openstack/clouds.yaml (ex: PCP-RYAEXPT-dc3-a). Peut aussi être fourni via OS_CLOUD."
  type        = string
  default     = "PCP-RYAEXPT-dc3-a"
}

variable "name_prefix" {
  description = "Préfixe appliqué à toutes les ressources pour rester repérable sur un compte cloud partagé."
  type        = string
  default     = "arborisis"
}

variable "flavor_name" {
  description = "Gabarit de la VM. Défaut = dimensionnement de départ documenté (4 vCPU / 8 Go RAM / 80 Go SSD)."
  type        = string
  default     = "a4-ram8-disk80-perf1"
}

variable "image_name" {
  description = "Image système de la VM."
  type        = string
  default     = "Ubuntu 24.04 LTS Noble Numbat"
}

variable "external_network_name" {
  description = "Réseau externe Infomaniak pour l'IP flottante."
  type        = string
  default     = "ext-floating1"
}

variable "subnet_cidr" {
  description = "CIDR du sous-réseau privé de la VM."
  type        = string
  default     = "192.168.120.0/24"
}

variable "ssh_public_key" {
  description = "Clé publique SSH à injecter sur la VM (paire dédiée à Arborisis, ne pas réutiliser une clé d'un autre usage)."
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "Plage IP autorisée à se connecter en SSH (port 22). Ne JAMAIS laisser 0.0.0.0/0 en production — pas de défaut volontairement, à fournir explicitement."
  type        = string
}

variable "object_storage_container_name" {
  description = "Nom du container Object Storage (staging upload, proxy audio, tuiles PMTiles, backups DB)."
  type        = string
  default     = "arborisis-storage"
}

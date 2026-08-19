terraform {
  required_version = ">= 1.5.0"

  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 3.0"
    }
  }

  # Backend local par défaut au bootstrap. À migrer vers un backend distant
  # (ex. Object Storage Infomaniak via backend "s3" compatible) une fois
  # l'équipe/CI en place — voir plan/09-open-source-devops.md.
  # backend "local" {}
}

provider "openstack" {
  # Aucun identifiant en dur ici : utilise le cloud sélectionné via la
  # variable d'environnement OS_CLOUD, qui pointe vers
  # ~/.config/openstack/clouds.yaml (jamais commité).
  cloud = var.os_cloud
}

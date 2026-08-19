# Provisioning Infomaniak Public Cloud pour Arborisis — voir plan/04-infra-infomaniak.md
# Toutes les ressources sont préfixées avec var.name_prefix pour rester isolées
# sur un compte cloud potentiellement partagé avec d'autres usages.

data "openstack_networking_network_v2" "external" {
  name = var.external_network_name
}

data "openstack_compute_flavor_v2" "app" {
  name = var.flavor_name
}

data "openstack_images_image_v2" "app" {
  name        = var.image_name
  most_recent = true
}

# --- Réseau privé dédié -----------------------------------------------------

resource "openstack_networking_network_v2" "app" {
  name           = "${var.name_prefix}-net"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "app" {
  name            = "${var.name_prefix}-subnet"
  network_id      = openstack_networking_network_v2.app.id
  cidr            = var.subnet_cidr
  ip_version      = 4
  dns_nameservers = ["9.9.9.9", "1.1.1.1"]
}

resource "openstack_networking_router_v2" "app" {
  name                = "${var.name_prefix}-router"
  admin_state_up      = true
  external_network_id = data.openstack_networking_network_v2.external.id
}

resource "openstack_networking_router_interface_v2" "app" {
  router_id = openstack_networking_router_v2.app.id
  subnet_id = openstack_networking_subnet_v2.app.id
}

# --- Sécurité ----------------------------------------------------------------

resource "openstack_networking_secgroup_v2" "app" {
  name        = "${var.name_prefix}-sg"
  description = "Arborisis MVP — 80/443 ouverts, 22 restreint"
}

resource "openstack_networking_secgroup_rule_v2" "ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = var.ssh_allowed_cidr
  security_group_id = openstack_networking_secgroup_v2.app.id
}

resource "openstack_networking_secgroup_rule_v2" "http" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.app.id
}

resource "openstack_networking_secgroup_rule_v2" "https" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 443
  port_range_max    = 443
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.app.id
}

# --- Clé SSH dédiée ------------------------------------------------------------

resource "openstack_compute_keypair_v2" "app" {
  name       = "${var.name_prefix}-key"
  public_key = var.ssh_public_key
}

# --- Instance compute ----------------------------------------------------------

resource "openstack_compute_instance_v2" "app" {
  name            = "${var.name_prefix}-app-1"
  flavor_id       = data.openstack_compute_flavor_v2.app.id
  image_id        = data.openstack_images_image_v2.app.id
  key_pair        = openstack_compute_keypair_v2.app.name
  security_groups = [openstack_networking_secgroup_v2.app.name]
  user_data       = file("${path.module}/cloud-init.yaml")

  network {
    uuid = openstack_networking_network_v2.app.id
  }

  depends_on = [openstack_networking_router_interface_v2.app]
}

resource "openstack_networking_floatingip_v2" "app" {
  pool = data.openstack_networking_network_v2.external.name
}

resource "openstack_compute_floatingip_associate_v2" "app" {
  floating_ip = openstack_networking_floatingip_v2.app.address
  instance_id = openstack_compute_instance_v2.app.id
}

# --- Object Storage ------------------------------------------------------------
# Swift natif (compatible API S3 via les credentials EC2 Infomaniak — à générer
# séparément avec `openstack ec2 credentials create` le moment venu).

resource "openstack_objectstorage_container_v1" "app" {
  name = var.object_storage_container_name
}

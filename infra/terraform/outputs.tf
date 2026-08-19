output "floating_ip" {
  description = "IP publique de la VM — à pointer par le DNS de arborisis.com (voir plan/04-infra-infomaniak.md §4.4)."
  value       = openstack_networking_floatingip_v2.app.address
}

output "instance_id" {
  value = openstack_compute_instance_v2.app.id
}

output "object_storage_container" {
  value = openstack_objectstorage_container_v1.app.name
}

output "ssh_command" {
  value = "ssh ubuntu@${openstack_networking_floatingip_v2.app.address}"
}

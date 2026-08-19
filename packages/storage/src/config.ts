/**
 * Configuration du client Object Storage — un seul container/bucket S3-compatible
 * sert à la fois de staging d'upload et de dépôt final (originals/, proxy/), voir
 * plan/05-stockage-audio-internet-archive.md §5.10.
 *
 * En dev : MinIO (docker-compose.yml). En prod : Object Storage Infomaniak, API
 * Swift compatible S3 via des credentials EC2 (`openstack ec2 credentials
 * create`, voir plan/04-infra-infomaniak.md §4.1) — dans les deux cas
 * `forcePathStyle: true` est requis (ni MinIO ni le S3-compat d'Infomaniak ne
 * résolvent le bucket via un sous-domaine virtual-hosted-style).
 */
export interface StorageConfig {
  endpoint: string;
  /**
   * Région utilisée pour la signature SigV4, PAS pour choisir l'endpoint (déjà
   * fixé par `endpoint`, ex. `s3.pub1.infomaniak.cloud` = dc3-a). Vérifié en
   * conditions réelles contre l'Object Storage Infomaniak (`openstack ec2
   * credentials create`) : leur passerelle S3-compat rejette toute région
   * différente de "us-east-1" avec `AuthorizationHeaderMalformed` — la région
   * OpenStack réelle (dc3-a/dc4-a) n'a ici aucun rôle. MinIO accepte "us-east-1"
   * sans problème, donc une seule valeur convient aux deux environnements.
   */
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

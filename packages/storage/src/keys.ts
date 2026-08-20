/**
 * Convention de nommage des clés Object Storage — voir
 * plan/05-stockage-audio-internet-archive.md §5.2 et §5.10 (mode intérimaire :
 * originals/ ET proxy/ vivent tous les deux sur l'Object Storage Infomaniak
 * tant qu'Internet Archive n'est pas actif).
 */

/** Fichier brut déposé par le client avant qu'un enregistrement n'existe (étape 1 du flux Ajouter). */
export function stagingKey(uploadId: string, filename: string): string {
  return `staging/${uploadId}/${sanitizeFilename(filename)}`;
}

/** Copie pérenne (mode intérimaire) une fois l'enregistrement créé et le fichier validé. */
export function originalKey(recordingId: string, extension: string): string {
  return `originals/${recordingId}${normalizeExtension(extension)}`;
}

/** Proxy de lecture rapide, toujours transcodé en Opus — voir plan/05 §5.9. */
export function proxyKey(recordingId: string): string {
  return `proxy/${recordingId}.opus`;
}

// Évite tout caractère qui poserait problème dans une clé S3 ou un nom de
// fichier local (le nom d'origine n'a aucune valeur fonctionnelle une fois la
// clé construite, mais reste dans le préfixe staging/ pour rester lisible en
// cas d'inspection manuelle du bucket).
function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    // ".." n'a aucun sens de traversée dans une clé S3 (espace de noms plat),
    // mais reste neutralisé par prudence si cette valeur est un jour réutilisée
    // comme chemin local (voir apps/worker, fichiers temporaires).
    .replace(/\.\.+/g, "_");
  return cleaned.slice(-140) || "fichier";
}

function normalizeExtension(extension: string): string {
  if (!extension) return "";
  return extension.startsWith(".") ? extension : `.${extension}`;
}

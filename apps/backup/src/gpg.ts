import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Passphrase passée à `gpg` via un fichier temporaire à permissions
 * restreintes (`--passphrase-file`) plutôt qu'en argument de ligne de
 * commande — `gpg` n'a pas d'équivalent stdin propre qui n'entre pas en
 * conflit avec le flux de données lui-même. Fichier créé dans un dossier
 * temporaire dédié (mode 700) et supprimé immédiatement après usage, y
 * compris en cas d'erreur.
 */
async function withPassphraseFile<T>(passphrase: string, fn: (path: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "arborisis-backup-"));
  const path = join(dir, `pass-${randomBytes(8).toString("hex")}`);
  try {
    await writeFile(path, passphrase, { mode: 0o600 });
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function gpgEncrypt(inputPath: string, outputPath: string, passphrase: string): Promise<void> {
  await withPassphraseFile(passphrase, (passphraseFile) =>
    execFileAsync("gpg", [
      "--batch",
      "--yes",
      "--pinentry-mode",
      "loopback",
      "--cipher-algo",
      "AES256",
      "--passphrase-file",
      passphraseFile,
      "--symmetric",
      "--output",
      outputPath,
      inputPath,
    ])
  );
}

export async function gpgDecrypt(inputPath: string, outputPath: string, passphrase: string): Promise<void> {
  await withPassphraseFile(passphrase, (passphraseFile) =>
    execFileAsync("gpg", [
      "--batch",
      "--yes",
      "--pinentry-mode",
      "loopback",
      "--passphrase-file",
      passphraseFile,
      "--decrypt",
      "--output",
      outputPath,
      inputPath,
    ])
  );
}

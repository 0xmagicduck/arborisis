import { describe, expect, it } from "vitest";
import { originalKey, proxyKey, stagingKey } from "../keys.js";

describe("clés Object Storage", () => {
  it("préfixe staging/ avec l'id d'upload et assainit le nom de fichier", () => {
    expect(stagingKey("abc-123", "field recording (final) v2.WAV")).toBe(
      "staging/abc-123/field_recording__final__v2.WAV"
    );
  });

  it("neutralise les séquences de traversée de chemin dans le nom de fichier", () => {
    const key = stagingKey("abc-123", "../../etc/passwd");
    expect(key).not.toContain("..");
    expect(key).toBe("staging/abc-123/____etc_passwd");
  });

  it("construit la clé originals/ avec l'extension normalisée", () => {
    expect(originalKey("rec-1", ".wav")).toBe("originals/rec-1.wav");
    expect(originalKey("rec-1", "wav")).toBe("originals/rec-1.wav");
  });

  it("construit toujours la clé proxy/ en .opus — voir plan/05 §5.9", () => {
    expect(proxyKey("rec-1")).toBe("proxy/rec-1.opus");
  });
});

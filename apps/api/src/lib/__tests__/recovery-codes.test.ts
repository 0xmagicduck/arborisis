import { describe, expect, it } from "vitest";
import { generateRecoveryCodes, hashRecoveryCode, verifyRecoveryCode } from "../recovery-codes.js";

describe("recovery codes", () => {
  it("génère 10 codes uniques au format lisible", () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
  });

  it("vérifie un code haché correctement, rejette un code incorrect", async () => {
    const [code] = generateRecoveryCodes(1);
    const hash = await hashRecoveryCode(code!);
    await expect(verifyRecoveryCode(code!, hash)).resolves.toBe(true);
    await expect(verifyRecoveryCode("AAAA-AAAA-AAAA", hash)).resolves.toBe(false);
  });
});

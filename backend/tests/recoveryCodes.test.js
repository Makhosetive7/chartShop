import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateRecoveryCodeBatch,
  generateRecoveryCodePlaintext,
  hashRecoveryCode,
  normalizeRecoveryCode,
  recoveryCodesMatch,
  RECOVERY_CODE_COUNT,
} from "../utils/recoveryCodes.js";

describe("recoveryCodes util", () => {
  it("formats and normalizes codes", () => {
    const plain = generateRecoveryCodePlaintext();
    assert.match(plain, /^cs-[a-z0-9]{4}-[a-z0-9]{4}$/);
    assert.equal(
      normalizeRecoveryCode("CS-A3K9-M2PQ"),
      normalizeRecoveryCode("cs a3k9 m2pq")
    );
  });

  it("hashes consistently and matches timing-safe", () => {
    const a = hashRecoveryCode("cs-test-code");
    const b = hashRecoveryCode("CS-TEST-CODE");
    assert.ok(a);
    assert.equal(a, b);
    assert.equal(recoveryCodesMatch(a, b), true);
    assert.equal(recoveryCodesMatch(a, hashRecoveryCode("cs-other-code")), false);
  });

  it("generates a unique batch", () => {
    const batch = generateRecoveryCodeBatch(RECOVERY_CODE_COUNT);
    assert.equal(batch.length, RECOVERY_CODE_COUNT);
    assert.equal(new Set(batch.map(normalizeRecoveryCode)).size, batch.length);
  });
});

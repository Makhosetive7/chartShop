/**
 * Recovery codes: generate once, show once, store hashes only, single-use.
 * Format: cs-xxxx-xxxx (readable). Normalize before hash/compare.
 */

import crypto from "crypto";

export const RECOVERY_CODE_COUNT = 8;

/** Unambiguous alphabet (no 0/o, 1/i/l). */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

function pepper() {
  const configured = process.env.RECOVERY_CODE_PEPPER || process.env.SESSION_SECRET;
  
  // In production, require proper secret configuration
  if (process.env.NODE_ENV === 'production' && !configured) {
    throw new Error(
      'SECURITY: RECOVERY_CODE_PEPPER must be set in production. ' +
      'Generate with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  // Development fallback with warning
  if (!configured) {
    console.warn('WARNING: Using default recovery pepper in development. Set RECOVERY_CODE_PEPPER in production.');
    return "chartshop-recovery-v1-dev-only";
  }
  
  return configured;
}

function randomSegment(length) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Plaintext display form, e.g. cs-a3k9-m2pq */
export function generateRecoveryCodePlaintext() {
  return `cs-${randomSegment(4)}-${randomSegment(4)}`;
}

/**
 * Strip spaces/dashes/case for verification.
 * "CS-A3K9-M2PQ" / "cs a3k9 m2pq" → "csa3k9m2pq"
 */
export function normalizeRecoveryCode(code) {
  return String(code || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function hashRecoveryCode(code) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) return null;
  return crypto
    .createHmac("sha256", pepper())
    .update(normalized)
    .digest("hex");
}

export function recoveryCodesMatch(aHash, bHash) {
  if (!aHash || !bHash) return false;
  const a = Buffer.from(String(aHash), "utf8");
  const b = Buffer.from(String(bHash), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Generate N plaintext codes (unique within the batch). */
export function generateRecoveryCodeBatch(count = RECOVERY_CODE_COUNT) {
  const codes = [];
  const seen = new Set();
  let guard = 0;
  while (codes.length < count && guard < count * 20) {
    guard += 1;
    const plain = generateRecoveryCodePlaintext();
    const key = normalizeRecoveryCode(plain);
    if (seen.has(key)) continue;
    seen.add(key);
    codes.push(plain);
  }
  if (codes.length < count) {
    throw new Error("Failed to generate unique recovery codes");
  }
  return codes;
}

/**
 * ChartShop username policy (new registrations).
 *
 * - Lowercase letters; optional digits only at the end
 * - No spaces, underscores, dots, or special characters
 * - Length 3–15
 * - Case-insensitive uniqueness (normalize: trim + lowercase)
 * - Exact reserved-word blocklist
 *
 * Existing shops may still use legacy usernames (underscores, up to 32 chars).
 * Login accepts both shapes; only registration enforces this policy.
 */

import { normalizeUsername } from "./channelIdentity.js";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 15;

/** New registration format: letters, then optional trailing digits. */
export const USERNAME_PATTERN = /^(?=.{3,15}$)[a-z]+[0-9]*$/;

/** Grandfathered / demo accounts may still use this shape. */
export const LEGACY_USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export const RESERVED_USERNAMES = Object.freeze([
  "admin",
  "support",
  "system",
  "chartshop",
]);

const RESERVED_SET = new Set(RESERVED_USERNAMES);

export function isReservedUsername(username) {
  const normalized = normalizeUsername(username);
  return Boolean(normalized) && RESERVED_SET.has(normalized);
}

/** True if the string looks like a login username (new or legacy). */
export function isUsernameShaped(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;
  return (
    USERNAME_PATTERN.test(normalized) ||
    LEGACY_USERNAME_PATTERN.test(normalized)
  );
}

/**
 * Validate a username for new registration.
 * @returns {{ valid: boolean, message?: string, normalized?: string }}
 */
export function validateUsername(username) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return { valid: false, message: "Username cannot be empty" };
  }
  if (normalized.length < USERNAME_MIN) {
    return {
      valid: false,
      message: `Username must be at least ${USERNAME_MIN} characters`,
    };
  }
  if (normalized.length > USERNAME_MAX) {
    return {
      valid: false,
      message: `Username must be at most ${USERNAME_MAX} characters`,
    };
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return {
      valid: false,
      message:
        "Username must be lowercase letters only, with optional digits at the end (no spaces, underscores, or symbols)",
    };
  }
  if (isReservedUsername(normalized)) {
    return {
      valid: false,
      message: `"${normalized}" is reserved. Please choose a different username`,
    };
  }

  return { valid: true, normalized };
}

/** Letter prefix used when suggesting alternatives (strip trailing digits). */
export function usernameLetterRoot(username) {
  const normalized = normalizeUsername(username);
  const root = normalized.replace(/[0-9]+$/, "").replace(/[^a-z]/g, "");
  if (root.length >= 2) return root.slice(0, USERNAME_MAX - 1);
  if (root.length === 1) return `${root}u`.slice(0, USERNAME_MAX - 1);
  return "shop";
}

/**
 * Build candidate alternatives like musa1, musa2, …
 * @param {string} desired
 * @param {(candidate: string) => boolean | Promise<boolean>} isUnavailable
 * @param {number} [count=3]
 * @returns {Promise<string[]>}
 */
export async function suggestUsernames(desired, isUnavailable, count = 3) {
  const root = usernameLetterRoot(desired);
  const suggestions = [];
  let n = 1;

  while (suggestions.length < count && n < 1000) {
    const suffix = String(n);
    const maxLetters = USERNAME_MAX - suffix.length;
    if (maxLetters < 2) break;

    const candidate = `${root.slice(0, maxLetters)}${suffix}`;
    n += 1;

    if (!USERNAME_PATTERN.test(candidate)) continue;
    if (isReservedUsername(candidate)) continue;
    if (candidate === normalizeUsername(desired)) continue;

    // eslint-disable-next-line no-await-in-loop
    if (await isUnavailable(candidate)) continue;

    suggestions.push(candidate);
  }

  return suggestions;
}

export { normalizeUsername };

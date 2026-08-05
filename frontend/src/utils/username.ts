/**
 * Client-side mirror of backend/utils/usernamePolicy.js for register UX.
 * Server remains the source of truth for availability; local helpers power
 * instant feedback and offline suggestion chips.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 15;
export const USERNAME_PATTERN = /^(?=.{3,15}$)[a-z]+[0-9]*$/;

export const RESERVED_USERNAMES = new Set([
  'admin',
  'support',
  'system',
  'chartshop',
]);

export function normalizeUsername(username: string): string {
  return String(username || '')
    .trim()
    .toLowerCase();
}

/** Soft-normalize while typing: lowercase, strip disallowed characters. */
export function sanitizeUsernameInput(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, USERNAME_MAX);
}

export type UsernameValidation =
  | { valid: true; normalized: string }
  | { valid: false; normalized: string; message: string };

export function validateUsername(username: string): UsernameValidation {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return {
      valid: false,
      normalized,
      message: 'Username cannot be empty',
    };
  }
  if (normalized.length < USERNAME_MIN) {
    return {
      valid: false,
      normalized,
      message: `Username must be at least ${USERNAME_MIN} characters`,
    };
  }
  if (normalized.length > USERNAME_MAX) {
    return {
      valid: false,
      normalized,
      message: `Username must be at most ${USERNAME_MAX} characters`,
    };
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return {
      valid: false,
      normalized,
      message:
        'Use lowercase letters only, with optional digits at the end (no spaces or symbols)',
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      normalized,
      message: `"${normalized}" is reserved. Please choose a different username`,
    };
  }

  return { valid: true, normalized };
}

/** Letter prefix used when suggesting alternatives (strip trailing digits). */
export function usernameLetterRoot(username: string): string {
  const normalized = normalizeUsername(username);
  const root = normalized.replace(/[0-9]+$/, '').replace(/[^a-z]/g, '');
  if (root.length >= 2) return root.slice(0, USERNAME_MAX - 1);
  if (root.length === 1) return `${root}u`.slice(0, USERNAME_MAX - 1);
  return 'shop';
}

/**
 * Local alternatives like musa1, musa2 (does not check the server).
 * Prefer API suggestions when online so taken names are filtered out.
 */
export function buildLocalSuggestions(
  desired: string,
  count = 3,
  exclude: Iterable<string> = [],
): string[] {
  const excluded = new Set(
    [...exclude, normalizeUsername(desired)].map((s) => normalizeUsername(s)),
  );
  const root = usernameLetterRoot(desired);
  const suggestions: string[] = [];
  let n = 1;

  while (suggestions.length < count && n < 1000) {
    const suffix = String(n);
    const maxLetters = USERNAME_MAX - suffix.length;
    if (maxLetters < 2) break;

    const candidate = `${root.slice(0, maxLetters)}${suffix}`;
    n += 1;

    if (!USERNAME_PATTERN.test(candidate)) continue;
    if (RESERVED_USERNAMES.has(candidate)) continue;
    if (excluded.has(candidate)) continue;

    suggestions.push(candidate);
  }

  return suggestions;
}

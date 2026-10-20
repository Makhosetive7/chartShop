import { describe, expect, it } from 'vitest';

/**
 * Pure helpers mirroring hook matching (ids must include the param value).
 * Hook itself needs a router — covered by page wiring + this contract check.
 */
function canHighlight(
  paramValue: string | null,
  ids: Array<string | null | undefined>,
): boolean {
  if (!paramValue) return false;
  return ids.some((id) => id && String(id) === paramValue);
}

describe('deep link highlight matching', () => {
  it('matches when id is present', () => {
    expect(canHighlight('sale1', ['sale1', 'sale2'])).toBe(true);
  });

  it('rejects missing or empty param', () => {
    expect(canHighlight(null, ['sale1'])).toBe(false);
    expect(canHighlight('', ['sale1'])).toBe(false);
    expect(canHighlight('sale9', ['sale1'])).toBe(false);
  });
});

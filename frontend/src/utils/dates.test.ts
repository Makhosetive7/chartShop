import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHOP_TIMEZONE,
  formatShopDate,
  formatShopDateTime,
  formatShopDayLabel,
  formatShopTime,
  resolveShopTimezone,
  shopDayKey,
} from './dates';

describe('dates', () => {
  it('defaults timezone to Africa/Harare', () => {
    expect(resolveShopTimezone(null)).toBe(DEFAULT_SHOP_TIMEZONE);
    expect(resolveShopTimezone({})).toBe(DEFAULT_SHOP_TIMEZONE);
    expect(resolveShopTimezone({ timezone: 'Africa/Johannesburg' })).toBe(
      'Africa/Johannesburg',
    );
  });

  it('formats fixed English dates in shop timezone', () => {
    // 2026-08-06T12:00:00Z → afternoon in Harare (UTC+2)
    const iso = '2026-08-06T12:00:00.000Z';
    expect(formatShopDate(iso, 'Africa/Harare')).toBe('6 Aug 2026');
    expect(formatShopDateTime(iso, 'Africa/Harare')).toBe(
      '6 Aug 2026 · 14:00',
    );
    expect(formatShopTime(iso, 'Africa/Harare')).toBe('14:00');
  });

  it('uses Sept abbreviation for September (en-GB)', () => {
    const iso = '2026-09-19T10:00:00.000Z';
    expect(formatShopDate(iso, 'Africa/Harare')).toMatch(/^19 Sept? 2026$/);
  });

  it('builds day labels relative to shop calendar', () => {
    const now = new Date('2026-08-06T12:00:00.000Z');
    expect(
      formatShopDayLabel('2026-08-06T08:00:00.000Z', 'Africa/Harare', now),
    ).toBe('Today');
    expect(
      formatShopDayLabel('2026-08-05T08:00:00.000Z', 'Africa/Harare', now),
    ).toBe('Yesterday');
  });

  it('returns day keys in shop timezone', () => {
    // Just before midnight UTC may still be previous day in Harare? 
    // 2026-08-05T22:30Z = 6 Aug 00:30 Harare
    expect(shopDayKey('2026-08-05T22:30:00.000Z', 'Africa/Harare')).toBe(
      '2026-08-06',
    );
  });

  it('handles empty values', () => {
    expect(formatShopDate(null)).toBe('—');
    expect(formatShopDateTime(undefined)).toBe('—');
    expect(formatShopTime('')).toBe('—');
  });
});

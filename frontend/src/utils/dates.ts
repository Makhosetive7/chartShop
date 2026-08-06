/**
 * Shop-timezone + fixed English date display.
 * Default matches backend dateBounds (Africa/Harare).
 * Examples: 6 Aug 2026 · 19 Sept 2026
 */

export const DEFAULT_SHOP_TIMEZONE = 'Africa/Harare';

export function resolveShopTimezone(
  settings?: Record<string, unknown> | null,
): string {
  const tz = settings?.timezone;
  return typeof tz === 'string' && tz.trim() ? tz.trim() : DEFAULT_SHOP_TIMEZONE;
}

function toValidDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Calendar day key in shop TZ: YYYY-MM-DD */
export function shopDayKey(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_SHOP_TIMEZONE,
): string {
  const date = toValidDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Fixed English date: 6 Aug 2026 */
export function formatShopDate(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_SHOP_TIMEZONE,
): string {
  const date = toValidDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Fixed English date + 24h time: 6 Aug 2026 · 14:30 */
export function formatShopDateTime(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_SHOP_TIMEZONE,
): string {
  const date = toValidDate(value);
  if (!date) return '—';
  const day = formatShopDate(date, timeZone);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${day} · ${time}`;
}

/** Clock only in shop TZ: 14:30 */
export function formatShopTime(
  value: string | Date | null | undefined,
  timeZone = DEFAULT_SHOP_TIMEZONE,
): string {
  const date = toValidDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * Feed/chat day headings in shop TZ:
 * Today · Yesterday · Monday · Monday, 6 August · 6 August 2025
 */
export function formatShopDayLabel(
  value: string | Date,
  timeZone = DEFAULT_SHOP_TIMEZONE,
  now: Date = new Date(),
): string {
  const date = toValidDate(value);
  if (!date) return '—';

  const key = shopDayKey(date, timeZone);
  const todayKey = shopDayKey(now, timeZone);
  if (key === todayKey) return 'Today';

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (key === shopDayKey(yesterday, timeZone)) return 'Yesterday';

  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
  }).format(date);

  // Rough “within last 7 days” using day keys (good enough for feed labels).
  const daysAgo = (() => {
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const [ky, km, kd] = key.split('-').map(Number);
    const t = Date.UTC(ty, tm - 1, td);
    const k = Date.UTC(ky, km - 1, kd);
    return Math.round((t - k) / (24 * 60 * 60 * 1000));
  })();

  if (daysAgo >= 0 && daysAgo < 7) return weekday;

  const thisYear = todayKey.slice(0, 4);
  const sameYear = key.startsWith(thisYear);

  if (sameYear) {
    const rest = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: 'numeric',
      month: 'short',
    }).format(date);
    return `${weekday}, ${rest}`;
  }

  return formatShopDate(date, timeZone);
}

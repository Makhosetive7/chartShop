/**
 * Timezone-aware calendar bounds using Intl (no extra deps).
 * Default shop timezone: Africa/Harare.
 */

const DEFAULT_TIMEZONE = "Africa/Harare";

function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function getTimezoneOffsetMs(timeZone, date) {
  const parts = getZonedParts(date, timeZone);
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUTC - date.getTime();
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC Date.
 */
export function zonedLocalToUtc(
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
  timeZone = DEFAULT_TIMEZONE
) {
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, ms)
  );
  const offset = getTimezoneOffsetMs(timeZone, utcGuess);
  let result = new Date(utcGuess.getTime() - offset);

  // Correct once for DST transitions
  const offset2 = getTimezoneOffsetMs(timeZone, result);
  if (offset2 !== offset) {
    result = new Date(utcGuess.getTime() - offset2);
  }

  return result;
}

export function getZonedYmd(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const parts = getZonedParts(date, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

/**
 * Start/end of the calendar day containing `date` in `timeZone`.
 * End is exclusive-safe: start of next local day minus 1ms.
 */
export function getDayBounds(timeZone = DEFAULT_TIMEZONE, date = new Date()) {
  const { year, month, day } = getZonedYmd(date, timeZone);
  const startDate = zonedLocalToUtc(year, month, day, 0, 0, 0, 0, timeZone);

  const nextDayUtc = new Date(
    Date.UTC(year, month - 1, day) + 24 * 60 * 60 * 1000
  );
  const nextYmd = {
    year: nextDayUtc.getUTCFullYear(),
    month: nextDayUtc.getUTCMonth() + 1,
    day: nextDayUtc.getUTCDate(),
  };
  const nextStart = zonedLocalToUtc(
    nextYmd.year,
    nextYmd.month,
    nextYmd.day,
    0,
    0,
    0,
    0,
    timeZone
  );
  const endDate = new Date(nextStart.getTime() - 1);

  return { startDate, endDate };
}

/**
 * Rolling 7-day window ending at end of today in `timeZone`.
 */
export function getWeekBounds(timeZone = DEFAULT_TIMEZONE, date = new Date()) {
  const { endDate } = getDayBounds(timeZone, date);
  const startAnchor = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
  const { startDate } = getDayBounds(timeZone, startAnchor);
  return { startDate, endDate };
}

/**
 * Calendar month bounds in `timeZone`.
 * @param {number} month 0-indexed
 */
export function getMonthBounds(month, year, timeZone = DEFAULT_TIMEZONE) {
  const startDate = zonedLocalToUtc(year, month + 1, 1, 0, 0, 0, 0, timeZone);

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }
  const nextStart = zonedLocalToUtc(
    nextYear,
    nextMonth + 1,
    1,
    0,
    0,
    0,
    0,
    timeZone
  );
  const endDate = new Date(nextStart.getTime() - 1);

  return { startDate, endDate };
}

export { DEFAULT_TIMEZONE };

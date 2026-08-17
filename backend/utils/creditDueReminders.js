import {
  DEFAULT_TIMEZONE,
  addYmdDays,
  getZonedYmd,
  ymdDiffDays,
  ymdEqual,
} from "./dateBounds.js";

export const CREDIT_OVERDUE_EVERY_DAYS = 3;
export const CREDIT_OVERDUE_MAX_DAYS = 30;

/**
 * Which reminder (if any) fires for this due date on `now`'s calendar day.
 * Schedule: day before, due day, then every 3 days for 30 days after.
 */
export function reminderSlotForToday(
  dueDate,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE
) {
  if (!dueDate) return null;

  const dueYmd = getZonedYmd(dueDate, timeZone);
  const todayYmd = getZonedYmd(now, timeZone);

  if (ymdEqual(todayYmd, addYmdDays(dueYmd, -1))) {
    return { key: "before", kind: "before", daysOverdue: 0 };
  }

  if (ymdEqual(todayYmd, dueYmd)) {
    return { key: "due", kind: "due", daysOverdue: 0 };
  }

  const daysAfter = ymdDiffDays(dueYmd, todayYmd);
  if (
    daysAfter > 0 &&
    daysAfter <= CREDIT_OVERDUE_MAX_DAYS &&
    daysAfter % CREDIT_OVERDUE_EVERY_DAYS === 0
  ) {
    return {
      key: `overdue:${daysAfter}`,
      kind: "overdue",
      daysOverdue: daysAfter,
    };
  }

  return null;
}

export function creditDueQueryWindow(now = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const todayYmd = getZonedYmd(now, timeZone);
  const startYmd = addYmdDays(todayYmd, -CREDIT_OVERDUE_MAX_DAYS);
  const endYmd = addYmdDays(todayYmd, 1);
  return { todayYmd, startYmd, endYmd };
}

/**
 * Live chase status for a credit sale due date (not only today's reminder slot).
 */
export function creditChaseStatus(
  dueDate,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE
) {
  if (!dueDate) return null;
  const dueYmd = getZonedYmd(dueDate, timeZone);
  const todayYmd = getZonedYmd(now, timeZone);
  const daysUntilDue = ymdDiffDays(todayYmd, dueYmd);

  if (daysUntilDue < 0) {
    return {
      status: "overdue",
      daysOverdue: -daysUntilDue,
      daysUntilDue,
    };
  }
  if (daysUntilDue === 0) {
    return { status: "due", daysOverdue: 0, daysUntilDue: 0 };
  }
  if (daysUntilDue === 1) {
    return { status: "tomorrow", daysOverdue: 0, daysUntilDue: 1 };
  }
  return { status: "upcoming", daysOverdue: 0, daysUntilDue };
}

import {
  DEFAULT_TIMEZONE,
  getDayBounds,
  getZonedYmd,
  zonedLocalToUtc,
} from "./dateBounds.js";

const DUE_IN_TEXT = /\bdue\s+(\S+)/i;

/**
 * Credit due dates are calendar days in the shop timezone.
 * Accepts YYYY-MM-DD or an ISO datetime; stores start of that local day.
 */
export function parseCreditDueDate(raw, saleDate = new Date()) {
  if (raw == null || String(raw).trim() === "") {
    return {
      ok: false,
      error: "dueDate is required (YYYY-MM-DD or ISO date).",
    };
  }

  const text = String(raw).trim();
  let parsed;

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const utcCheck = new Date(Date.UTC(year, month - 1, day));
    if (
      utcCheck.getUTCFullYear() !== year ||
      utcCheck.getUTCMonth() !== month - 1 ||
      utcCheck.getUTCDate() !== day
    ) {
      return { ok: false, error: "dueDate is not a valid calendar date." };
    }
    parsed = zonedLocalToUtc(year, month, day, 0, 0, 0, 0);
  } else {
    parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return {
        ok: false,
        error: "dueDate must be YYYY-MM-DD or an ISO date.",
      };
    }
  }

  const dueYmd = getZonedYmd(parsed);
  const dueDayStart = zonedLocalToUtc(
    dueYmd.year,
    dueYmd.month,
    dueYmd.day,
    0,
    0,
    0,
    0
  );
  const { startDate: saleDayStart } = getDayBounds(
    DEFAULT_TIMEZONE,
    saleDate
  );
  if (dueDayStart < saleDayStart) {
    return { ok: false, error: "dueDate cannot be before the sale date." };
  }

  return { ok: true, dueDate: dueDayStart };
}

/**
 * Pull `due YYYY-MM-DD` (or ISO token) out of chat remainder text.
 */
export function extractCreditDueFromText(itemsText) {
  const text = String(itemsText || "").trim();
  const match = DUE_IN_TEXT.exec(text);
  if (!match) {
    return { found: false, dueRaw: null, itemsText: text };
  }

  const dueRaw = match[1];
  const itemsOnly = text
    .replace(match[0], " ")
    .replace(/\s+/g, " ")
    .trim();

  return { found: true, dueRaw, itemsText: itemsOnly };
}

import { DEFAULT_TIMEZONE, getZonedDateTime } from "../utils/dateBounds.js";
import { runCreditDueReminders } from "../services/CreditDueReminderService.js";

const CHECK_MS = 15 * 60 * 1000;
const DEFAULT_HOUR = 7;

let timer = null;
let lastRunKey = null;

function reminderHour() {
  const parsed = Number(process.env.CREDIT_DUE_REMINDER_HOUR);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 23) {
    return parsed;
  }
  return DEFAULT_HOUR;
}

export async function tickCreditDueReminders(now = new Date()) {
  if (process.env.CREDIT_DUE_REMINDERS === "false") {
    return null;
  }

  const zoned = getZonedDateTime(now, DEFAULT_TIMEZONE);
  const dayKey = `${zoned.year}-${String(zoned.month).padStart(2, "0")}-${String(zoned.day).padStart(2, "0")}`;
  if (lastRunKey === dayKey) return { skipped: true, reason: "already_ran", date: dayKey };
  if (zoned.hour < reminderHour()) {
    return { skipped: true, reason: "before_hour", date: dayKey, hour: zoned.hour };
  }

  const result = await runCreditDueReminders(now);
  lastRunKey = dayKey;
  console.log("[credit-due] ran", result);
  return result;
}

export function startCreditDueReminderJob() {
  if (process.env.CREDIT_DUE_REMINDERS === "false") {
    console.log("[credit-due] job disabled");
    return;
  }

  if (timer) return;

  const run = () => {
    tickCreditDueReminders().catch((error) => {
      console.error("[credit-due] tick failed:", error.message);
    });
  };

  timer = setInterval(run, CHECK_MS);
  setTimeout(run, 12_000);
  console.log(
    `[credit-due] daily job started (after ${reminderHour()}:00 ${DEFAULT_TIMEZONE}, every 15m)`
  );
}

export function stopCreditDueReminderJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function resetCreditDueReminderRunState() {
  lastRunKey = null;
}

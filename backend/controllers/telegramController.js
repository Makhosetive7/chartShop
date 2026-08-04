import { handleTelegramUpdate } from "../adapters/telegram.js";

/**
 * Verify Telegram secret_token header when TELEGRAM_WEBHOOK_SECRET is configured.
 */
function verifyTelegramSecret(req, res) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[webhook] Rejecting request: TELEGRAM_WEBHOOK_SECRET missing in production"
      );
      res.sendStatus(401);
      return false;
    }
    return true;
  }

  const provided = req.get("X-Telegram-Bot-Api-Secret-Token");
  if (provided !== expected) {
    console.warn("[webhook] Rejected request: invalid secret token");
    res.sendStatus(401);
    return false;
  }

  return true;
}

export const handleWebhook = async (req, res) => {
  try {
    if (!verifyTelegramSecret(req, res)) {
      return;
    }

    const update = req.body;
    console.log("Webhook received:", update.update_id);

    if (!update.message || !update.message.text) {
      console.log("No text message, ignoring");
      return res.sendStatus(200);
    }

    await handleTelegramUpdate(update);
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    console.error("Error details:", error.stack);
    res.sendStatus(500);
  }
};

export const testWebhook = (req, res) => {
  res.json({
    status: "active",
    message: "Telegram webhook endpoint",
    method: "POST",
    description: "Send Telegram updates to this endpoint",
    instructions: "Use POST with Telegram update JSON",
    environment: process.env.NODE_ENV || "development",
    mode: process.env.USE_POLLING === "true" ? "polling" : "webhook",
  });
};

import {
  handleWhatsAppWebhook,
  verifyWhatsAppWebhook,
  isWhatsAppConfigured,
} from "../adapters/whatsapp.js";

/**
 * Meta webhook verification (GET).
 */
export const verifyWebhook = (req, res) => {
  const result = verifyWhatsAppWebhook(req.query);
  if (result.ok) {
    return res.status(200).send(result.challenge);
  }
  return res.sendStatus(403);
};

/**
 * Inbound WhatsApp Cloud API updates (POST).
 */
export const handleWebhook = async (req, res) => {
  try {
    // Always 200 quickly so Meta does not retry aggressively
    res.sendStatus(200);

    if (!isWhatsAppConfigured()) {
      console.log("[whatsapp] Webhook hit but adapter disabled/misconfigured");
      return;
    }

    await handleWhatsAppWebhook(req.body);
  } catch (error) {
    console.error("[whatsapp] Webhook error:", error);
  }
};

export const testWebhook = (req, res) => {
  res.json({
    status: isWhatsAppConfigured() ? "configured" : "disabled",
    message: "WhatsApp Cloud API webhook",
    method: "POST",
    verify: "GET with hub.mode / hub.verify_token / hub.challenge",
    identity: "Shop accounts use wa:<phone> as the channel user id",
  });
};

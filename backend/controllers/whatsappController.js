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
    if (!isWhatsAppConfigured()) {
      console.log("[whatsapp] Webhook hit but adapter disabled/misconfigured");
      return res.sendStatus(200);
    }

    // Extract signature for verification
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

    const result = await handleWhatsAppWebhook(req.body, {
      signature,
      rawBody
    });

    // Check for signature verification failure
    if (result.error && result.reason === 'signature_verification_failed') {
      console.error("[whatsapp] Rejecting webhook due to signature failure");
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Webhook signature verification failed'
      });
    }

    // Always 200 for valid webhooks so Meta doesn't retry aggressively
    res.sendStatus(200);
    
  } catch (error) {
    console.error("[whatsapp] Webhook error:", error);
    res.sendStatus(200); // Still return 200 to prevent Meta retries
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

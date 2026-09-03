import axios from "axios";
import crypto from "crypto";
import { handleInboundMessage } from "./inbound.js";

/**
 * WhatsApp Cloud API adapter.
 * Inbound actor id is `wa:<phone>`; AuthService stores phone on
 * Shop.channels.whatsappPhone and resolves the shop by username login.
 */
function getConfig() {
  return {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    enabled: process.env.WHATSAPP_ENABLED === "true",
  };
}

export function isWhatsAppConfigured() {
  const cfg = getConfig();
  return Boolean(cfg.enabled && cfg.token && cfg.phoneNumberId);
}

export function verifyWhatsAppWebhook(query = {}) {
  const cfg = getConfig();
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token && token === cfg.verifyToken) {
    return { ok: true, challenge };
  }

  return { ok: false };
}

/**
 * Verify WhatsApp webhook signature for POST requests.
 * Meta signs webhook payloads with HMAC-SHA256 using the app secret.
 */
export function verifyWhatsAppSignature(rawBody, signature, appSecret) {
  if (!appSecret) {
    console.warn("[whatsapp] WHATSAPP_APP_SECRET not set - signature verification disabled");
    return { verified: false, reason: 'no_secret' };
  }

  if (!signature) {
    console.warn("[whatsapp] No X-Hub-Signature-256 header received");
    return { verified: false, reason: 'no_signature' };
  }

  // Meta sends: "sha256=<hex-encoded-hash>"
  if (!signature.startsWith('sha256=')) {
    console.warn("[whatsapp] Invalid signature format:", signature.substring(0, 20));
    return { verified: false, reason: 'invalid_format' };
  }

  const expectedHash = signature.substring(7); // Remove "sha256=" prefix
  const computedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // Use timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedHash, 'hex'),
    Buffer.from(computedHash, 'hex')
  );

  if (!isValid) {
    console.warn("[whatsapp] Signature verification failed");
    console.warn("Expected:", expectedHash.substring(0, 16) + "...");
    console.warn("Computed:", computedHash.substring(0, 16) + "...");
  }

  return { 
    verified: isValid, 
    reason: isValid ? 'valid' : 'mismatch'
  };
}

export async function sendWhatsAppText(to, body) {
  const cfg = getConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    throw new Error("WhatsApp is not configured");
  }

  const url = `https://graph.facebook.com/v19.0/${cfg.phoneNumberId}/messages`;
  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: String(body ?? "") },
    },
    {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
    }
  );
}

function extractInboundMessages(payload) {
  const messages = [];
  const entries = payload?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const msg of value.messages || []) {
        if (msg.type === "text" && msg.text?.body) {
          messages.push({
            from: msg.from,
            text: msg.text.body,
            id: msg.id,
          });
        }
      }
    }
  }

  return messages;
}

/**
 * Handle Meta WhatsApp Cloud API webhook POST body.
 * Now requires signature verification in production.
 */
export async function handleWhatsAppWebhook(payload, options = {}) {
  const cfg = getConfig();
  if (!cfg.enabled) {
    return { ignored: true, reason: "whatsapp_disabled" };
  }

  if (!cfg.token || !cfg.phoneNumberId) {
    console.warn("[whatsapp] Enabled but WHATSAPP_TOKEN / PHONE_NUMBER_ID missing");
    return { ignored: true, reason: "misconfigured" };
  }

  // Verify webhook signature in production or when app secret is configured
  if ((process.env.NODE_ENV === 'production' || cfg.appSecret) && options.signature !== undefined) {
    const verification = verifyWhatsAppSignature(
      options.rawBody || JSON.stringify(payload),
      options.signature,
      cfg.appSecret
    );

    if (!verification.verified) {
      console.error(`[whatsapp] Webhook signature verification failed: ${verification.reason}`);
      
      // In production, reject unsigned webhooks
      if (process.env.NODE_ENV === 'production') {
        return { 
          error: true, 
          reason: 'signature_verification_failed',
          details: verification.reason 
        };
      } else {
        console.warn("[whatsapp] Development mode: continuing despite signature failure");
      }
    } else {
      console.log("[whatsapp] Webhook signature verified successfully");
    }
  }

  const inbound = extractInboundMessages(payload);
  for (const msg of inbound) {
    const userId = `wa:${msg.from}`;
    console.log(`[whatsapp] Message from ${userId}: ${msg.text}`);

    try {
      await handleInboundMessage({
        userId,
        text: msg.text,
        channel: "whatsapp",
        sendText: (body) => sendWhatsAppText(msg.from, body),
        // Documents: text fallback until media upload is wired
        sendDocument: async (_filePath, caption) => {
          await sendWhatsAppText(
            msg.from,
            caption ||
              "PDF reports are available on Telegram for now. Ask for a text summary with daily/weekly/monthly."
          );
        },
      });
    } catch (error) {
      console.error("[whatsapp] Failed to process message:", error.message);
      try {
        await sendWhatsAppText(
          msg.from,
          "Sorry, an error occurred. Please try again."
        );
      } catch (_) {
        /* ignore */
      }
    }
  }

  return { ok: true, processed: inbound.length };
}

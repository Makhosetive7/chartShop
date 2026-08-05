import axios from "axios";
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

async function sendWhatsAppText(to, body) {
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
 */
export async function handleWhatsAppWebhook(payload) {
  const cfg = getConfig();
  if (!cfg.enabled) {
    return { ignored: true, reason: "whatsapp_disabled" };
  }

  if (!cfg.token || !cfg.phoneNumberId) {
    console.warn("[whatsapp] Enabled but WHATSAPP_TOKEN / PHONE_NUMBER_ID missing");
    return { ignored: true, reason: "misconfigured" };
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

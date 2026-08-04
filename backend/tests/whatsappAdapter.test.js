import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  verifyWhatsAppWebhook,
  isWhatsAppConfigured,
} from "../adapters/whatsapp.js";

describe("whatsapp adapter", () => {
  it("reports disabled when WHATSAPP_ENABLED is not true", () => {
    const prev = process.env.WHATSAPP_ENABLED;
    process.env.WHATSAPP_ENABLED = "false";
    assert.equal(isWhatsAppConfigured(), false);
    process.env.WHATSAPP_ENABLED = prev;
  });

  it("verifies Meta hub challenge with matching token", () => {
    const prev = process.env.WHATSAPP_VERIFY_TOKEN;
    process.env.WHATSAPP_VERIFY_TOKEN = "phase5-verify";
    const result = verifyWhatsAppWebhook({
      "hub.mode": "subscribe",
      "hub.verify_token": "phase5-verify",
      "hub.challenge": "998877",
    });
    assert.equal(result.ok, true);
    assert.equal(result.challenge, "998877");
    process.env.WHATSAPP_VERIFY_TOKEN = prev;
  });

  it("rejects verify with wrong token", () => {
    const prev = process.env.WHATSAPP_VERIFY_TOKEN;
    process.env.WHATSAPP_VERIFY_TOKEN = "phase5-verify";
    const result = verifyWhatsAppWebhook({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong",
      "hub.challenge": "1",
    });
    assert.equal(result.ok, false);
    process.env.WHATSAPP_VERIFY_TOKEN = prev;
  });
});

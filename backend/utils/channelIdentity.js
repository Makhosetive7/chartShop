/**
 * Channel identity helpers.
 * Platform transport ids are not the shop login identity — username is.
 */

export const CHANNELS = Object.freeze(["telegram", "whatsapp", "web"]);

/**
 * Resolve inbound actor id + optional channel hint into { channel, channelKey }.
 * WhatsApp inbound uses `wa:<phone>`; we store phone without the prefix.
 */
export function resolveChannelIdentity(actorId, channelHint) {
  const raw = String(actorId ?? "").trim();
  const hint = String(channelHint || "").toLowerCase();

  if (hint === "web") {
    return { channel: "web", channelKey: raw };
  }

  if (hint === "whatsapp" || raw.startsWith("wa:")) {
    return {
      channel: "whatsapp",
      channelKey: raw.replace(/^wa:/i, ""),
    };
  }

  if (hint === "telegram" || raw) {
    return {
      channel: "telegram",
      channelKey: raw.replace(/^tg:/i, ""),
    };
  }

  return { channel: "telegram", channelKey: raw };
}

export function shopChannelQuery(channel, channelKey) {
  if (!channelKey) return null;
  if (channel === "telegram") {
    return { "channels.telegramChatId": String(channelKey) };
  }
  if (channel === "whatsapp") {
    return { "channels.whatsappPhone": String(channelKey) };
  }
  return null;
}

export function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase();
}

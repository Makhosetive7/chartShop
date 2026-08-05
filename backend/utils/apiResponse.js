/**
 * Strip Telegram Markdown markers for JSON API clients.
 */
export function stripMarkdown(text) {
  if (text == null) return "";
  return String(text)
    .replace(/[*_`\[\]]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function publicShop(shop) {
  if (!shop) return null;
  const obj = typeof shop.toObject === "function" ? shop.toObject() : { ...shop };
  delete obj.pin;
  return {
    id: String(obj._id),
    username: obj.username,
    businessName: obj.businessName,
    businessDescription: obj.businessDescription,
    isActive: obj.isActive,
    isDemo: Boolean(obj.isDemo),
    settings: obj.settings,
    lastLogin: obj.lastLogin,
    createdAt: obj.createdAt,
    channels: {
      telegramLinked: Boolean(obj.channels?.telegramChatId),
      whatsappLinked: Boolean(obj.channels?.whatsappPhone),
    },
  };
}

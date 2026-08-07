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

export function publicUser(user) {
  if (!user) return null;
  const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete obj.pin;
  return {
    id: String(obj._id),
    shopId: obj.shopId != null ? String(obj.shopId) : null,
    username: obj.username,
    displayName: obj.displayName || obj.username,
    role: obj.role || "member",
    isActive: obj.isActive !== false,
    mustSetPin: Boolean(obj.mustSetPin),
    lastLogin: obj.lastLogin || null,
    createdAt: obj.createdAt,
    channels: {
      telegramLinked: Boolean(obj.channels?.telegramChatId),
      whatsappLinked: Boolean(obj.channels?.whatsappPhone),
    },
  };
}

export function publicShop(shop, user = null) {
  if (!shop) return null;
  const obj = typeof shop.toObject === "function" ? shop.toObject() : { ...shop };
  delete obj.pin;

  const fromUser = user
    ? typeof user.toObject === "function"
      ? user.toObject()
      : user
    : null;

  return {
    id: String(obj._id),
    // Username / channels come from the signed-in user (Shop is no longer a login).
    username: fromUser?.username || obj.username || null,
    businessName: obj.businessName,
    businessDescription: obj.businessDescription,
    isActive: obj.isActive,
    isDemo: Boolean(obj.isDemo),
    demoSector: obj.demoSector || null,
    settings: obj.settings,
    lastLogin: fromUser?.lastLogin || obj.lastLogin || null,
    createdAt: obj.createdAt,
    channels: {
      telegramLinked: Boolean(
        fromUser?.channels?.telegramChatId || obj.channels?.telegramChatId
      ),
      whatsappLinked: Boolean(
        fromUser?.channels?.whatsappPhone || obj.channels?.whatsappPhone
      ),
    },
  };
}

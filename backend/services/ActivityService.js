import crypto from "crypto";
import ActivityLog from "../models/ActivityLog.js";
import Shop from "../models/Shop.js";
import SessionStore from "./sessionStore.js";
import { stripMarkdown } from "../utils/apiResponse.js";
import {
  normalizeUsername,
  resolveChannelIdentity,
  shopChannelQuery,
} from "../utils/channelIdentity.js";

export function detectChannel(userId, explicit) {
  if (explicit) return explicit;
  if (String(userId || "").startsWith("wa:")) return "whatsapp";
  return "telegram";
}

function truncate(text, max = 280) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

class ActivityService {
  async resolveShopId(userId, shopId, channel) {
    if (shopId) return shopId;

    const username = normalizeUsername(userId);
    if (username && /^[a-z0-9_]{3,32}$/.test(username)) {
      const byUsername = await Shop.findOne({ username }).select("_id");
      if (byUsername) return byUsername._id;
    }

    const { channel: ch, channelKey } = resolveChannelIdentity(
      userId,
      channel
    );

    // Active login session is the source of truth across web / TG / WA.
    if (channelKey) {
      const session = await SessionStore.getLoginSession(ch, channelKey);
      if (session?.shopId) return session.shopId;
    }

    const query = shopChannelQuery(ch, channelKey);
    if (!query) return null;
    const shop = await Shop.findOne(query).select("_id");
    return shop?._id || null;
  }

  async log({
    shopId,
    userId,
    channel,
    action,
    summary,
    entityType = null,
    entityId = null,
    metadata = {},
    requestId = null,
  }) {
    try {
      const resolvedShopId = await this.resolveShopId(
        userId,
        shopId,
        channel
      );
      if (!resolvedShopId) {
        return null;
      }

      return await ActivityLog.create({
        shopId: resolvedShopId,
        actorId: String(userId),
        channel: detectChannel(userId, channel),
        action,
        entityType,
        entityId: entityId != null ? String(entityId) : null,
        summary: truncate(summary, 400),
        metadata,
        requestId: requestId || crypto.randomUUID(),
      });
    } catch (error) {
      // Never break the main request path for logging failures
      console.error("[ActivityService] log failed:", error.message);
      return null;
    }
  }

  /**
   * Log one chat turn (user command + bot reply) for any channel.
   */
  async logChatTurn({
    shopId,
    userId,
    channel,
    input,
    reply,
    replyType = "text",
    requestId = null,
  }) {
    const replyText =
      typeof reply === "string"
        ? reply
        : reply?.message || reply?.type || JSON.stringify(reply);

    const cleanReply = stripMarkdown(replyText);
    const cleanInput = String(input || "").trim();

    return this.log({
      shopId,
      userId,
      channel,
      action: "chat.turn",
      entityType: "chat",
      summary: truncate(`→ ${cleanInput} · ← ${cleanReply}`, 400),
      metadata: {
        input: cleanInput,
        reply: cleanReply,
        replyType,
        rawReplyPreview:
          typeof reply === "object" && reply?.type
            ? { type: reply.type, fileName: reply.fileName }
            : undefined,
      },
      requestId,
    });
  }

  async list(shopId, { limit = 50, action, channel, before } = {}) {
    const query = { shopId };
    if (action) query.action = action;
    if (channel) query.channel = channel;
    if (before) query.createdAt = { $lt: new Date(before) };

    const items = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200))
      .lean();

    return items.map((row) => ({
      id: String(row._id),
      actorId: row.actorId,
      channel: row.channel,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.summary,
      metadata: row.metadata,
      requestId: row.requestId,
      createdAt: row.createdAt,
    }));
  }

  /** Chat transcript derived from chat.turn logs (oldest → newest for UI). */
  async chatHistory(shopId, { limit = 100 } = {}) {
    const items = await this.list(shopId, {
      limit,
      action: "chat.turn",
    });
    return this.turnsToBubbles(items);
  }

  /**
   * Demo /app feed: chat transcript plus system/other logs.
   * Sale/expense rows that already appear as chat.turn are skipped to avoid doubles.
   */
  async demoActivityFeed(shopId, { limit = 120 } = {}) {
    const fetchLimit = Math.min(Math.max(parseInt(limit, 10) || 120, 40) * 2, 200);
    const items = await this.list(shopId, { limit: fetchLimit });
    const keep = items.filter(
      (row) =>
        row.action === "chat.turn" ||
        row.action === "demo.seeded" ||
        (row.action !== "sale.cash" &&
          row.action !== "sale.credit" &&
          row.action !== "expense.recorded")
    );
    return this.activityToBubbles(keep.slice(0, Math.min(fetchLimit, 200)));
  }

  turnsToBubbles(items) {
    return items.reverse().flatMap((row) => {
      const input = row.metadata?.input || "";
      const reply = row.metadata?.reply || row.summary;
      const bubbles = [];
      if (input) {
        bubbles.push({
          id: `${row.id}-in`,
          role: "user",
          text: input,
          channel: row.channel,
          createdAt: row.createdAt,
        });
      }
      if (reply) {
        bubbles.push({
          id: `${row.id}-out`,
          role: "assistant",
          text: reply,
          replyType: row.metadata?.replyType || "text",
          channel: row.channel,
          createdAt: row.createdAt,
        });
      }
      return bubbles;
    });
  }

  activityToBubbles(items) {
    // list() returns newest → oldest; reverse for chronological UI
    return [...items].reverse().flatMap((row) => {
      if (row.action === "chat.turn") {
        return this.turnsToBubbles([row]);
      }

      const label = row.action.replace(/\./g, " · ");
      return [
        {
          id: row.id,
          role: "assistant",
          text: `${label}\n${row.summary}`,
          type: "activity",
          channel: row.channel,
          createdAt: row.createdAt,
        },
      ];
    });
  }
}

export default new ActivityService();

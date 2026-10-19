import crypto from "crypto";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";
import SessionStore from "./sessionStore.js";
import { stripMarkdown } from "../utils/apiResponse.js";
import {
  normalizeUsername,
  resolveChannelIdentity,
  userChannelQuery,
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

    // ObjectId-shaped actor → User
    if (userId && /^[a-f0-9]{24}$/i.test(String(userId))) {
      const byId = await User.findById(userId).select("shopId");
      if (byId?.shopId) return byId.shopId;
    }

    const username = normalizeUsername(userId);
    if (username && /^[a-z0-9_]{3,32}$/.test(username)) {
      const byUsername = await User.findOne({ username }).select("shopId");
      if (byUsername?.shopId) return byUsername.shopId;
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

    const query = userChannelQuery(ch, channelKey);
    if (!query) return null;
    const user = await User.findOne(query).select("shopId");
    return user?.shopId || null;
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

  async list(shopId, { limit = 50, action, channel, before, actorId } = {}) {
    const query = { shopId };
    if (action) query.action = action;
    if (channel) query.channel = channel;
    if (before) query.createdAt = { $lt: new Date(before) };
    if (actorId) {
      const key = String(actorId);
      // Match ObjectId actor or legacy username actor for the same person
      const user = /^[a-f0-9]{24}$/i.test(key)
        ? await User.findById(key).select("username")
        : await User.findOne({ username: normalizeUsername(key) }).select(
            "_id username"
          );
      if (user) {
        query.actorId = {
          $in: [String(user._id), user.username].filter(Boolean),
        };
      } else {
        query.actorId = key;
      }
    }

    const items = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200))
      .lean();

    const actorIds = [...new Set(items.map((row) => String(row.actorId || "")))];
    const objectIds = actorIds.filter((id) => /^[a-f0-9]{24}$/i.test(id));
    const usernames = actorIds.filter(
      (id) => id && !/^[a-f0-9]{24}$/i.test(id)
    );

    const or = [];
    if (objectIds.length) or.push({ _id: { $in: objectIds } });
    if (usernames.length) or.push({ username: { $in: usernames } });

    const users = or.length
      ? await User.find({ $or: or }).select("_id username displayName").lean()
      : [];

    const byId = new Map(users.map((u) => [String(u._id), u]));
    const byUsername = new Map(users.map((u) => [u.username, u]));

    return items.map((row) => {
      const actorKey = String(row.actorId || "");
      const user =
        byId.get(actorKey) ||
        byUsername.get(normalizeUsername(actorKey)) ||
        null;
      return {
        id: String(row._id),
        actorId: row.actorId,
        actorUsername: user?.username || null,
        actorDisplayName: user?.displayName || user?.username || null,
        channel: row.channel,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        metadata: row.metadata,
        requestId: row.requestId,
        createdAt: row.createdAt,
      };
    });
  }

  /**
   * Chat transcript for /app/chat: all shop activity (commands + page mutations).
   * Oldest → newest for UI. Demo and real shops share this feed.
   */
  async chatHistory(shopId, { limit = 100 } = {}) {
    const fetchLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const items = await this.list(shopId, { limit: fetchLimit });
    return this.activityToBubbles(items);
  }

  /** @deprecated Prefer chatHistory — kept as an alias for callers/tests. */
  async demoActivityFeed(shopId, opts = {}) {
    return this.chatHistory(shopId, opts);
  }

  turnsToBubbles(items) {
    return items.reverse().flatMap((row) => {
      const input = row.metadata?.input || "";
      const reply = row.metadata?.reply || row.summary;
      const actor = {
        actorUsername: row.actorUsername || null,
        actorDisplayName: row.actorDisplayName || null,
      };
      const bubbles = [];
      if (input) {
        bubbles.push({
          id: `${row.id}-in`,
          role: "user",
          text: input,
          channel: row.channel,
          createdAt: row.createdAt,
          ...actor,
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
          ...actor,
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

      const summary = String(row.summary || "").trim();
      const label = row.action.replace(/\./g, " · ");
      return [
        {
          id: row.id,
          role: "assistant",
          text: summary || label,
          type: "activity",
          action: row.action,
          channel: row.channel,
          actorUsername: row.actorUsername || null,
          actorDisplayName: row.actorDisplayName || null,
          createdAt: row.createdAt,
        },
      ];
    });
  }
}

export default new ActivityService();

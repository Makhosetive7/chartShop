import crypto from "crypto";
import commandService from "../../services/commandService.js";
import ActivityService from "../../services/ActivityService.js";
import { stripMarkdown } from "../../utils/apiResponse.js";

function normalizeReply(response) {
  if (response && typeof response === "object") {
    if (response.type === "pdf" || response.type === "pdf_generating") {
      return {
        type: response.type,
        text: stripMarkdown(response.message || "Report ready."),
        fileName: response.fileName || null,
        filePath: response.filePath || null,
      };
    }
    return {
      type: "text",
      text: stripMarkdown(response.message || JSON.stringify(response)),
    };
  }
  return {
    type: "text",
    text: stripMarkdown(response),
  };
}

/**
 * Web chat: same command engine as Telegram/WhatsApp.
 * POST { message: "sell 2 bread" }
 */
export async function sendChatMessage(req, res) {
  try {
    const message = String(req.body?.message || req.body?.text || "").trim();
    if (!message) {
      return res.status(400).json({
        success: false,
        error: "message is required.",
      });
    }

    const requestId = crypto.randomUUID();
    const response = await commandService.processCommand(
      req.channelKey || req.sessionToken,
      message,
      "web"
    );
    const reply = normalizeReply(response);

    await ActivityService.logChatTurn({
      shopId: req.shopId,
      userId: req.username || req.userId,
      channel: "web",
      input: message,
      reply: reply.text,
      replyType: reply.type,
      requestId,
    });

    return res.json({
      success: true,
      requestId,
      message: {
        role: "user",
        text: message,
        createdAt: new Date().toISOString(),
      },
      reply: {
        role: "assistant",
        text: reply.text,
        type: reply.type,
        fileName: reply.fileName,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[api/chat]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process chat message.",
    });
  }
}

export async function getChatHistory(req, res) {
  try {
    const limit = req.query.limit || 100;
    const messages = req.isDemo
      ? await ActivityService.demoActivityFeed(req.shopId, { limit })
      : await ActivityService.chatHistory(req.shopId, { limit });
    return res.json({
      success: true,
      demoFeed: Boolean(req.isDemo),
      messages,
    });
  } catch (error) {
    console.error("[api/chat/history]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load chat history.",
    });
  }
}

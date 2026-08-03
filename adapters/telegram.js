import telegramService from "../services/telegramService.js";
import { handleInboundMessage } from "./inbound.js";

/**
 * Process one Telegram Bot API update (webhook or polling).
 */
export async function handleTelegramUpdate(update) {
  if (!update?.message?.text) {
    return { ignored: true };
  }

  const chatId = update.message.chat.id;
  const userId = chatId.toString();
  const text = update.message.text;

  console.log(`[telegram] Message from ${userId}: ${text}`);

  await handleInboundMessage({
    userId,
    text,
    sendText: (body) => telegramService.sendMessage(chatId, body),
    sendDocument: (filePath, caption) =>
      telegramService.sendDocument(chatId, filePath, caption),
  });

  return { ok: true };
}

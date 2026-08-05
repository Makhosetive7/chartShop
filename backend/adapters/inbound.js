import crypto from "crypto";
import commandService from "../services/commandService.js";
import ActivityService, { detectChannel } from "../services/ActivityService.js";

/**
 * Shared inbound path for all chat adapters.
 * @param {{ userId: string, text: string, channel?: string, sendText: Function, sendDocument?: Function }} ctx
 */
export async function handleInboundMessage({
  userId,
  text,
  channel,
  sendText,
  sendDocument,
}) {
  const requestId = crypto.randomUUID();
  const response = await commandService.processCommand(
    userId,
    text,
    detectChannel(userId, channel)
  );

  let replyType = "text";
  let replyText = "";

  if (response && typeof response === "object") {
    if (response.type === "pdf") {
      replyType = "pdf";
      replyText = response.message || "";
      if (typeof sendDocument === "function") {
        await sendDocument(response.filePath, response.message || "");
      } else {
        await sendText(
          response.message ||
            "Report ready, but this channel cannot send documents yet."
        );
      }
    } else if (response.type === "pdf_generating") {
      replyType = "pdf_generating";
      replyText = response.message || "";
      await sendText(response.message);
    } else {
      replyText =
        response.message ||
        (typeof response === "string" ? response : JSON.stringify(response));
      await sendText(replyText);
    }
  } else {
    replyText = String(response ?? "");
    await sendText(response);
  }

  await ActivityService.logChatTurn({
    userId,
    channel: detectChannel(userId, channel),
    input: text,
    reply: replyText,
    replyType,
    requestId,
  });

  return response;
}

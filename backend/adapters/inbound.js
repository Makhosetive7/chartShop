import crypto from "crypto";
import commandService from "../services/commandService.js";
import AuthService from "../services/AuthService.js";
import ActivityService, { detectChannel } from "../services/ActivityService.js";
import { resolveChannelIdentity } from "../utils/channelIdentity.js";

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
  const resolvedChannel = detectChannel(userId, channel);
  const { channel: ch, channelKey } = resolveChannelIdentity(
    userId,
    resolvedChannel
  );
  const response = await commandService.processCommand(
    userId,
    text,
    resolvedChannel
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

  // Prefer session shopId so TG/WA turns land in the same shop transcript as web.
  const shop = await AuthService.getAuthenticatedShop(ch, channelKey);
  const user = await AuthService.getAuthenticatedUser(ch, channelKey);
  await ActivityService.logChatTurn({
    shopId: shop?._id,
    userId: user?._id ? String(user._id) : userId,
    channel: ch,
    input: text,
    reply: replyText,
    replyType,
    requestId,
  });

  return response;
}

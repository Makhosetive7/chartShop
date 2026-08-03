import commandService from "../services/commandService.js";

/**
 * Shared inbound path for all chat adapters.
 * @param {{ userId: string, text: string, sendText: Function, sendDocument?: Function }} ctx
 */
export async function handleInboundMessage({
  userId,
  text,
  sendText,
  sendDocument,
}) {
  const response = await commandService.processCommand(userId, text);

  if (response && typeof response === "object") {
    if (response.type === "pdf") {
      if (typeof sendDocument === "function") {
        await sendDocument(response.filePath, response.message || "");
      } else {
        await sendText(
          response.message ||
            "Report ready, but this channel cannot send documents yet."
        );
      }
      return response;
    }

    if (response.type === "pdf_generating") {
      await sendText(response.message);
      return response;
    }
  }

  await sendText(response);
  return response;
}

/**
 * Escape Telegram legacy Markdown special characters in user-controlled text.
 */
export function escapeMarkdown(text) {
  if (text == null) return "";
  return String(text).replace(/([_*`[\]])/g, "\\$1");
}

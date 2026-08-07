/**
 * Thin helper so API controllers log with consistent actor attribution.
 * Never throws — activity must not break the main request.
 */
import ActivityService from "../services/ActivityService.js";

export async function logApiActivity(req, {
  action,
  summary,
  entityType = null,
  entityId = null,
  metadata = {},
}) {
  try {
    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId || req.username,
      channel: req.channel || "web",
      action,
      summary,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      metadata,
    });
  } catch (error) {
    console.error("[logApiActivity]", error?.message || error);
  }
}

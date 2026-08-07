import ActivityService from "../../services/ActivityService.js";

export async function listActivity(req, res) {
  try {
    const items = await ActivityService.list(req.shopId, {
      limit: req.query.limit,
      action: req.query.action,
      channel: req.query.channel,
      before: req.query.before,
      actorId:
        req.query.mine === "1" || req.query.mine === "true"
          ? req.userId
          : req.query.actorId || null,
    });
    return res.json({ success: true, items });
  } catch (error) {
    console.error("[api/activity]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list activity.",
    });
  }
}

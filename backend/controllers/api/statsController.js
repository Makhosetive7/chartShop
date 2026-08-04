import StatsService from "../../services/StatsService.js";

export async function overview(req, res) {
  try {
    const days = req.query.days;
    const limit = req.query.limit;
    const data = await StatsService.overview(req.shopId, { days, limit });
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[api/stats/overview]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate stats overview.",
    });
  }
}

export async function products(req, res) {
  try {
    const data = await StatsService.productStats(req.shopId, {
      days: req.query.days,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[api/stats/products]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate product stats.",
    });
  }
}

export async function customers(req, res) {
  try {
    const data = await StatsService.customerStats(req.shopId, {
      days: req.query.days,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[api/stats/customers]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate customer stats.",
    });
  }
}

export async function sales(req, res) {
  try {
    const data = await StatsService.salesStats(req.shopId, {
      days: req.query.days,
    });
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[api/stats/sales]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate sales stats.",
    });
  }
}

export async function inventory(req, res) {
  try {
    const data = await StatsService.inventoryStats(req.shopId);
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[api/stats/inventory]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate inventory stats.",
    });
  }
}

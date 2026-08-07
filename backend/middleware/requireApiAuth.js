import Shop from "../models/Shop.js";
import User from "../models/User.js";
import AuthService from "../services/AuthService.js";
import SessionStore from "../services/sessionStore.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Demo sessions may read and log out; all other mutations are blocked. */
function isDemoSafeRequest(req) {
  if (SAFE_METHODS.has(req.method)) return true;
  const path = String(req.path || "");
  const original = String(req.originalUrl || "");
  return (
    req.method === "POST" &&
    (path === "/auth/logout" || original.includes("/auth/logout"))
  );
}

/**
 * Require Authorization: Bearer <sessionToken> for /api/v1 routes.
 * Sets req.user, req.userId, req.username, req.role, req.shopId, req.shop, …
 * Demo shops are read-only (except logout).
 */
export async function requireApiAuth(req, res, next) {
  try {
    const header = req.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header. Use Bearer <token>.",
      });
    }

    const sessionToken = match[1].trim();
    const session = await SessionStore.getLoginSessionByToken(sessionToken);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session. Please login again.",
      });
    }

    const now = Date.now();
    const lastActivity = new Date(
      session.lastActivity || session.loginTime
    ).getTime();
    if (now - lastActivity > AuthService.sessionTimeout) {
      await SessionStore.deleteLoginSessionByToken(sessionToken);
      return res.status(401).json({
        success: false,
        error: "Session expired. Please login again.",
      });
    }

    const shop = await Shop.findById(session.shopId);
    if (!shop) {
      await SessionStore.deleteLoginSessionByToken(sessionToken);
      return res.status(401).json({
        success: false,
        error: "Shop not found for this session.",
      });
    }

    if (shop.isActive === false) {
      return res.status(403).json({
        success: false,
        error: "This shop account is disabled.",
      });
    }

    let user = null;
    if (session.userId) {
      user = await User.findById(session.userId);
    }
    // Legacy sessions (pre multi-user): no userId — refuse and force re-login.
    if (!user || user.isActive === false || user.removedAt) {
      await SessionStore.deleteLoginSessionByToken(sessionToken);
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session. Please login again.",
      });
    }

    if (String(user.shopId) !== String(shop._id)) {
      await SessionStore.deleteLoginSessionByToken(sessionToken);
      return res.status(401).json({
        success: false,
        error: "Invalid session.",
      });
    }

    await SessionStore.touchLoginSessionByToken(sessionToken);

    req.user = user;
    req.userId = String(user._id);
    req.username = user.username;
    req.role = user.role;
    req.shopId = shop._id;
    req.shop = shop;
    req.isDemo = Boolean(shop.isDemo);
    req.sessionToken = sessionToken;
    req.channel = session.channel;
    req.channelKey = session.channelKey;

    if (shop.isDemo && !isDemoSafeRequest(req)) {
      return res.status(403).json({
        success: false,
        code: "DEMO_READ_ONLY",
        error:
          "This is a demo shop — create your own shop to save changes.",
      });
    }

    return next();
  } catch (error) {
    console.error("[requireApiAuth]", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed.",
    });
  }
}

/** Admin-only routes (team management, etc.). Must run after requireApiAuth. */
export function requireAdmin(req, res, next) {
  if (req.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Admin access required.",
    });
  }
  return next();
}

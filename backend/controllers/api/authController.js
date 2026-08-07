import Shop from "../../models/Shop.js";
import User from "../../models/User.js";
import AuthService from "../../services/AuthService.js";
import ActivityService from "../../services/ActivityService.js";
import SessionStore from "../../services/sessionStore.js";
import { publicShop, publicUser, stripMarkdown } from "../../utils/apiResponse.js";
import { normalizeUsername } from "../../utils/channelIdentity.js";
import {
  DEMO_SECTORS,
  getDemoSector,
  publicDemoSector,
} from "../../constants/demoSectors.js";

function actorId(user) {
  return user?._id != null ? String(user._id) : user?.id || null;
}

export async function login(req, res) {
  try {
    const username = String(
      req.body?.username || req.body?.userId || ""
    ).trim();
    const pin = String(req.body?.pin || "").trim();

    if (!username || !pin) {
      return res.status(400).json({
        success: false,
        error: "username and pin are required.",
      });
    }

    const result = await AuthService.loginWithCredentials({
      username,
      pin,
      channel: "web",
      channelKey: null,
    });

    if (!result.success) {
      const status = result.code === "MUST_SET_PIN" ? 403 : 401;
      return res.status(status).json({
        success: false,
        code: result.code || undefined,
        error: stripMarkdown(result.message),
      });
    }

    await ActivityService.log({
      shopId: result.shop?._id,
      userId: actorId(result.user) || result.user?.username,
      channel: "web",
      action: "auth.login",
      summary: `Signed in on web`,
      entityType: "session",
    });

    return res.json({
      success: true,
      token: result.sessionToken,
      shop: publicShop(result.shop, result.user),
      user: publicUser(result.user),
    });
  } catch (error) {
    console.error("[api/auth/login]", error);
    return res.status(500).json({
      success: false,
      error: "Login failed.",
    });
  }
}

/** List available multi-sector demo shops. */
export async function listDemos(req, res) {
  try {
    const shops = await Shop.find({ isDemo: true, isActive: true }).lean();
    const shopIds = shops.map((s) => s._id);
    const admins = await User.find({
      shopId: { $in: shopIds },
      role: "admin",
      isActive: { $ne: false },
    }).lean();
    const adminByShop = new Map(
      admins.map((u) => [String(u.shopId), u])
    );

    const bySector = new Map(
      shops
        .filter((s) => s.demoSector)
        .map((s) => [String(s.demoSector).toLowerCase(), s])
    );

    // Legacy single boutique without demoSector
    if (!bySector.has("clothing")) {
      const clothingAdmin = admins.find((u) => u.username === "boutique_demo");
      if (clothingAdmin) {
        const legacy = shops.find(
          (s) => String(s._id) === String(clothingAdmin.shopId)
        );
        if (legacy) bySector.set("clothing", legacy);
      }
    }

    const demos = DEMO_SECTORS.map((sector) => {
      const shop = bySector.get(sector.id) || null;
      const admin = shop ? adminByShop.get(String(shop._id)) : null;
      return publicDemoSector(sector, shop, admin);
    });

    return res.json({
      success: true,
      demos,
    });
  } catch (error) {
    console.error("[api/auth/demos]", error);
    return res.status(500).json({
      success: false,
      error: "Could not list demo shops.",
    });
  }
}

async function findDemoAdminUser(shop) {
  if (!shop) return null;
  let user = await User.findOne({
    shopId: shop._id,
    role: "admin",
    isActive: { $ne: false },
  });
  if (!user) {
    user = await User.findOne({
      shopId: shop._id,
      isActive: { $ne: false },
    });
  }
  return user;
}

/** Enter a shared read-only demo shop without registering. */
export async function enterDemo(req, res) {
  try {
    const sectorId = String(req.body?.sector || req.query?.sector || "")
      .trim()
      .toLowerCase();

    let shop = null;

    if (sectorId) {
      const meta = getDemoSector(sectorId);
      if (!meta) {
        return res.status(400).json({
          success: false,
          error: `Unknown demo sector. Choose one of: ${DEMO_SECTORS.map((s) => s.id).join(", ")}.`,
        });
      }
      shop = await Shop.findOne({
        isDemo: true,
        isActive: true,
        demoSector: sectorId,
      });
      if (!shop && sectorId === "clothing") {
        const admin = await User.findOne({ username: "boutique_demo" });
        if (admin) shop = await Shop.findById(admin.shopId);
      }
      if (!shop) {
        return res.status(503).json({
          success: false,
          error: `Demo for "${meta.label}" is not seeded yet. Run npm run seed:demos.`,
        });
      }
    } else {
      shop = await Shop.findOne({
        isDemo: true,
        isActive: true,
        demoSector: "clothing",
      });
      if (!shop) {
        shop = await Shop.findOne({ isDemo: true, isActive: true });
      }
      if (!shop) {
        const admin = await User.findOne({ username: "boutique_demo" });
        if (admin) shop = await Shop.findById(admin.shopId);
      }
      if (!shop) {
        return res.status(503).json({
          success: false,
          error:
            "Demo shop is not available yet. Run npm run seed:demos and try again.",
        });
      }
    }

    if (!shop.isDemo) {
      shop.isDemo = true;
      if (!shop.demoSector) shop.demoSector = sectorId || "clothing";
      await shop.save();
    } else if (!shop.demoSector && sectorId) {
      shop.demoSector = sectorId;
      await shop.save();
    }

    const user = await findDemoAdminUser(shop);
    if (!user) {
      return res.status(503).json({
        success: false,
        error: "Demo shop has no user. Run npm run seed:demos.",
      });
    }

    const { sessionToken } = await AuthService.openChannelSession(
      shop,
      user,
      "web",
      null
    );

    await ActivityService.log({
      shopId: shop._id,
      userId: actorId(user),
      channel: "web",
      action: "auth.demo",
      summary: `Entered ${shop.demoSector || "demo"} demo shop on web`,
      entityType: "session",
    });

    return res.json({
      success: true,
      token: sessionToken,
      shop: publicShop(shop, user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("[api/auth/demo]", error);
    return res.status(500).json({
      success: false,
      error: "Could not start demo session.",
    });
  }
}

export async function logout(req, res) {
  try {
    const result = await AuthService.logoutByToken(req.sessionToken);
    return res.json({
      success: result.success,
      message: stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/auth/logout]", error);
    return res.status(500).json({
      success: false,
      error: "Logout failed.",
    });
  }
}

export async function me(req, res) {
  return res.json({
    success: true,
    shop: publicShop(req.shop, req.user),
    user: publicUser(req.user),
  });
}

/** One-shot register with username + PIN. */
export async function register(req, res) {
  try {
    const username = String(
      req.body?.username || req.body?.userId || ""
    ).trim();
    const businessName = String(req.body?.businessName || "").trim();
    const pin = String(req.body?.pin || "").trim();
    const businessDescription = String(
      req.body?.businessDescription || "General merchandise"
    ).trim();

    if (!username || !businessName || !pin) {
      return res.status(400).json({
        success: false,
        error: "username, businessName, and pin are required.",
      });
    }

    const result = await AuthService.registerAccount({
      username,
      businessName,
      businessDescription,
      pin,
      channel: "web",
      channelKey: null,
    });

    if (!result.success) {
      const status = /taken|already/i.test(result.message) ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: stripMarkdown(result.message),
        ...(result.suggestions?.length
          ? { suggestions: result.suggestions }
          : {}),
      });
    }

    await ActivityService.log({
      shopId: result.shop?._id,
      userId: actorId(result.user) || result.user?.username,
      channel: "web",
      action: "auth.register",
      summary: `Registered on web`,
      entityType: "session",
    });

    return res.status(201).json({
      success: true,
      token: result.sessionToken,
      shop: publicShop(result.shop, result.user),
      user: publicUser(result.user),
      recoveryCodes: result.recoveryCodes || [],
    });
  } catch (error) {
    console.error("[api/auth/register]", error);
    return res.status(500).json({
      success: false,
      error: "Registration failed.",
    });
  }
}

export async function status(req, res) {
  try {
    const username = normalizeUsername(
      req.query.username || req.body?.username || req.query.userId || ""
    );
    if (!username) {
      return res.status(400).json({
        success: false,
        error: "username is required.",
      });
    }

    const user = await AuthService.findUserByUsername(username);
    const shop = user ? await Shop.findById(user.shopId) : null;

    return res.json({
      success: true,
      registered: Boolean(user),
      shop: shop ? publicShop(shop, user) : null,
      user: user ? publicUser(user) : null,
    });
  } catch (error) {
    console.error("[api/auth/status]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get status.",
    });
  }
}

/** Real-time username availability for registration / profile edit. */
export async function checkUsername(req, res) {
  try {
    const username = String(
      req.query.username || req.body?.username || ""
    ).trim();
    if (!username) {
      return res.status(400).json({
        success: false,
        error: "username is required.",
      });
    }

    let excludeUserId = null;
    const header = req.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const session = await SessionStore.getLoginSessionByToken(
        match[1].trim()
      );
      if (session?.userId) excludeUserId = session.userId;
    }

    const result = await AuthService.checkUsernameAvailability(username, {
      excludeUserId,
    });
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[api/auth/username]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to check username.",
    });
  }
}

export async function profile(req, res) {
  try {
    const result = await AuthService.getProfileByShop(req.shop, {
      isLoggedIn: true,
      user: req.user,
    });
    return res.json({
      success: true,
      shop: publicShop(req.shop, req.user),
      user: publicUser(req.user),
      profile: result.profile,
    });
  } catch (error) {
    console.error("[api/auth/profile]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get profile.",
    });
  }
}

export async function updateProfileName(req, res) {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required to change business name.",
      });
    }

    const name = String(req.body?.businessName || req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        error: "businessName is required.",
      });
    }

    const result = await AuthService.updateBusinessNameForShop(req.shop, name);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    const shop = await Shop.findById(req.shopId);
    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "shop.name",
      summary: `Updated business name to ${name}`,
      entityType: "shop",
      entityId: String(req.shopId),
    });
    return res.json({
      success: true,
      shop: publicShop(shop, req.user),
      user: publicUser(req.user),
      message: stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/auth/profile/name]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update name.",
    });
  }
}

export async function updateProfileUsername(req, res) {
  try {
    const username = String(
      req.body?.username || req.body?.userId || ""
    ).trim();
    if (!username) {
      return res.status(400).json({
        success: false,
        error: "username is required.",
      });
    }

    const result = await AuthService.updateUsernameForUser(req.user, username);
    if (!result.success) {
      const status = /taken|already/i.test(result.message) ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: stripMarkdown(result.message),
        ...(result.suggestions?.length
          ? { suggestions: result.suggestions }
          : {}),
      });
    }

    const user = result.user || (await User.findById(req.user._id));
    await ActivityService.log({
      shopId: req.shopId,
      userId: actorId(user),
      channel: req.channel || "web",
      action: "auth.username",
      summary: result.message,
      entityType: "user",
    });

    return res.json({
      success: true,
      shop: publicShop(req.shop, user),
      user: publicUser(user),
      message: stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/auth/profile/username]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update username.",
    });
  }
}

export async function updateProfileDescription(req, res) {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required to change business description.",
      });
    }

    const description = String(
      req.body?.businessDescription || req.body?.description || ""
    ).trim();
    if (!description) {
      return res.status(400).json({
        success: false,
        error: "businessDescription is required.",
      });
    }

    const result = await AuthService.updateBusinessDescriptionForShop(
      req.shop,
      description
    );
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    const shop = await Shop.findById(req.shopId);
    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "shop.description",
      summary: "Updated business description",
      entityType: "shop",
      entityId: String(req.shopId),
    });
    return res.json({
      success: true,
      shop: publicShop(shop, req.user),
      user: publicUser(req.user),
      message: stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/auth/profile/description]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update description.",
    });
  }
}

function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Update shop preferences: timezone and low-stock default (currency stays USD). */
export async function updateProfileSettings(req, res) {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required to change shop settings.",
      });
    }

    const shop = await Shop.findById(req.shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: "Shop not found.",
      });
    }

    if (!shop.settings) {
      shop.settings = {};
    }

    const hasTimezone = Object.prototype.hasOwnProperty.call(
      req.body || {},
      "timezone"
    );
    const hasLowStock = Object.prototype.hasOwnProperty.call(
      req.body || {},
      "lowStockAlert"
    );

    if (!hasTimezone && !hasLowStock) {
      return res.status(400).json({
        success: false,
        error: "Provide timezone and/or lowStockAlert.",
      });
    }

    if (hasTimezone) {
      const timezone = String(req.body.timezone || "").trim();
      if (!timezone || !isValidTimezone(timezone)) {
        return res.status(400).json({
          success: false,
          error: "Invalid timezone. Use an IANA name like Africa/Harare.",
        });
      }
      shop.settings.timezone = timezone;
    }

    if (hasLowStock) {
      const lowStockAlert = parseInt(req.body.lowStockAlert, 10);
      if (!Number.isFinite(lowStockAlert) || lowStockAlert < 0) {
        return res.status(400).json({
          success: false,
          error: "lowStockAlert must be an integer >= 0.",
        });
      }
      shop.settings.lowStockAlert = lowStockAlert;
    }

    shop.markModified("settings");
    await shop.save();

    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "shop.settings",
      summary: "Updated shop preferences",
      entityType: "shop",
      entityId: String(req.shopId),
      metadata: {
        timezone: shop.settings?.timezone,
        lowStockAlert: shop.settings?.lowStockAlert,
      },
    });

    return res.json({
      success: true,
      shop: publicShop(shop, req.user),
      user: publicUser(req.user),
      message: "Shop settings updated.",
    });
  } catch (error) {
    console.error("[api/auth/profile/settings]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update settings.",
    });
  }
}

/** One-shot PIN change (API equivalent of chat multi-step pin edit). */
export async function updateProfilePin(req, res) {
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const oldPin = String(req.body?.oldPin || "").trim();
    const newPin = String(req.body?.newPin || "").trim();

    if (!oldPin || !newPin) {
      return res.status(400).json({
        success: false,
        error: "oldPin and newPin are required.",
      });
    }

    const user = req.user;
    const validOld = await bcrypt.compare(oldPin, user.pin);
    if (!validOld) {
      return res.status(401).json({
        success: false,
        error: "Incorrect old PIN.",
      });
    }

    const pinValidation = AuthService.validatePin(newPin);
    if (!pinValidation.valid) {
      return res.status(400).json({
        success: false,
        error: pinValidation.message,
      });
    }

    if (oldPin === newPin) {
      return res.status(400).json({
        success: false,
        error: "New PIN must be different from the old PIN.",
      });
    }

    user.pin = await bcrypt.hash(newPin, 12);
    await user.save();

    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "auth.pin",
      summary: "Changed PIN",
      entityType: "user",
      entityId: String(user._id),
    });

    return res.json({
      success: true,
      message: "PIN updated successfully.",
    });
  } catch (error) {
    console.error("[api/auth/profile/pin]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update PIN.",
    });
  }
}

export async function updateProfileDisplayName(req, res) {
  try {
    const displayName = String(
      req.body?.displayName || req.body?.name || ""
    ).trim();
    if (!displayName) {
      return res.status(400).json({
        success: false,
        error: "displayName is required.",
      });
    }

    const result = await AuthService.updateDisplayNameForUser(
      req.user,
      displayName
    );
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "auth.display_name",
      summary: `Updated display name to ${displayName}`,
      entityType: "user",
      entityId: String(req.user._id),
    });

    return res.json({
      success: true,
      user: publicUser(result.user || req.user),
      shop: publicShop(req.shop, result.user || req.user),
      message: stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/auth/profile/display-name]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update display name.",
    });
  }
}

/** Public: invite setup — username + one-time setup code → set PIN. */
export async function setupPin(req, res) {
  try {
    const username = String(
      req.body?.username || req.body?.userId || ""
    ).trim();
    const setupCode = String(
      req.body?.setupCode || req.body?.code || ""
    ).trim();
    const newPin = String(req.body?.newPin || req.body?.pin || "").trim();

    if (!username || !setupCode || !newPin) {
      return res.status(400).json({
        success: false,
        error: "username, setupCode, and newPin are required.",
      });
    }

    const result = await AuthService.completePinSetup({
      username,
      setupCode,
      newPin,
    });

    if (!result.success) {
      const locked = /locked|too many/i.test(result.message || "");
      return res.status(locked ? 429 : 401).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await ActivityService.log({
      shopId: result.shop?._id || result.user?.shopId,
      userId: result.user?.id,
      channel: "web",
      action: "auth.setup_pin",
      summary: "Set PIN with invite setup code",
      entityType: "user",
      entityId: result.user?.id,
    });

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[api/auth/setup-pin]", error);
    return res.status(500).json({
      success: false,
      error: "Could not set PIN.",
    });
  }
}

/** Public: reset PIN with a one-time recovery code. */
export async function redeemRecovery(req, res) {
  try {
    const username = String(
      req.body?.username || req.body?.userId || ""
    ).trim();
    const code = String(req.body?.code || req.body?.recoveryCode || "").trim();
    const newPin = String(req.body?.newPin || req.body?.pin || "").trim();

    if (!username || !code || !newPin) {
      return res.status(400).json({
        success: false,
        error: "username, code, and newPin are required.",
      });
    }

    const result = await AuthService.redeemRecoveryCode({
      username,
      code,
      newPin,
    });

    if (!result.success) {
      const locked = /locked|too many/i.test(result.message || "");
      return res.status(locked ? 429 : 401).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    const user = await AuthService.findUserByUsername(username);
    await ActivityService.log({
      shopId: user?.shopId,
      userId: actorId(user) || normalizeUsername(username),
      channel: "web",
      action: "auth.recovery",
      summary: "PIN reset with recovery code",
      entityType: "user",
    });

    return res.json({
      success: true,
      message: result.message,
      remaining: result.remaining,
      mustRegenerate: result.mustRegenerate,
    });
  } catch (error) {
    console.error("[api/auth/recovery/redeem]", error);
    return res.status(500).json({
      success: false,
      error: "Recovery failed.",
    });
  }
}

/** Authenticated: status of unused recovery codes (no plaintext). */
export async function recoveryStatus(req, res) {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required.",
      });
    }
    const status = await AuthService.getRecoveryCodeStatus(req.shopId);
    return res.json({ success: true, ...status });
  } catch (error) {
    console.error("[api/auth/recovery]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get recovery status.",
    });
  }
}

/** Authenticated: revoke unused codes and issue a new set (shown once). */
export async function regenerateRecovery(req, res) {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required.",
      });
    }

    const result = await AuthService.issueRecoveryCodesForShop(req.shop, {
      revokeExisting: true,
    });
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }

    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "auth.recovery.regenerate",
      summary: "Issued a new recovery code set",
      entityType: "shop",
    });

    return res.json({
      success: true,
      message: result.message,
      recoveryCodes: result.codes,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error("[api/auth/recovery/regenerate]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to regenerate recovery codes.",
    });
  }
}

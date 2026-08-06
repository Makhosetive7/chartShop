import Shop from "../../models/Shop.js";
import AuthService from "../../services/AuthService.js";
import ActivityService from "../../services/ActivityService.js";
import SessionStore from "../../services/sessionStore.js";
import { publicShop, stripMarkdown } from "../../utils/apiResponse.js";
import { normalizeUsername } from "../../utils/channelIdentity.js";
import {
  DEMO_SECTORS,
  getDemoSector,
  publicDemoSector,
} from "../../constants/demoSectors.js";

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
      return res.status(401).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await ActivityService.log({
      shopId: result.shop?._id,
      userId: result.shop?.username,
      channel: "web",
      action: "auth.login",
      summary: `Signed in on web`,
      entityType: "session",
    });

    return res.json({
      success: true,
      token: result.sessionToken,
      shop: publicShop(result.shop),
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
    const bySector = new Map(
      shops
        .filter((s) => s.demoSector)
        .map((s) => [String(s.demoSector).toLowerCase(), s])
    );
    // Legacy single boutique without demoSector
    if (!bySector.has("clothing")) {
      const legacy = shops.find((s) => s.username === "boutique_demo");
      if (legacy) bySector.set("clothing", legacy);
    }

    const demos = DEMO_SECTORS.map((sector) =>
      publicDemoSector(sector, bySector.get(sector.id) || null)
    );

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
        shop = await Shop.findOne({
          username: "boutique_demo",
          isActive: true,
        });
      }
      if (!shop) {
        return res.status(503).json({
          success: false,
          error: `Demo for "${meta.label}" is not seeded yet. Run npm run seed:demos.`,
        });
      }
    } else {
      // Backward compatible: prefer clothing, else any demo
      shop = await Shop.findOne({
        isDemo: true,
        isActive: true,
        demoSector: "clothing",
      });
      if (!shop) {
        shop = await Shop.findOne({ isDemo: true, isActive: true });
      }
      if (!shop) {
        shop = await Shop.findOne({ username: "boutique_demo", isActive: true });
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
    } else if (!shop.demoSector && (sectorId || shop.username === "boutique_demo")) {
      shop.demoSector = sectorId || "clothing";
      await shop.save();
    }

    const { sessionToken } = await AuthService.openChannelSession(
      shop,
      "web",
      null
    );

    await ActivityService.log({
      shopId: shop._id,
      userId: shop.username,
      channel: "web",
      action: "auth.demo",
      summary: `Entered ${shop.demoSector || "demo"} demo shop on web`,
      entityType: "session",
    });

    return res.json({
      success: true,
      token: sessionToken,
      shop: publicShop(shop),
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
    shop: publicShop(req.shop),
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
      userId: result.shop?.username,
      channel: "web",
      action: "auth.register",
      summary: `Registered on web`,
      entityType: "session",
    });

    return res.status(201).json({
      success: true,
      token: result.sessionToken,
      shop: publicShop(result.shop),
      // Shown once — client must display immediately; never persisted server-side as plaintext.
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

    const shop = await AuthService.findShopByUsername(username);

    return res.json({
      success: true,
      registered: Boolean(shop),
      shop: shop ? publicShop(shop) : null,
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

    let excludeShopId = null;
    const header = req.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const session = await SessionStore.getLoginSessionByToken(
        match[1].trim()
      );
      if (session?.shopId) excludeShopId = session.shopId;
    }

    const result = await AuthService.checkUsernameAvailability(username, {
      excludeShopId,
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
    });
    return res.json({
      success: true,
      shop: publicShop(req.shop),
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
    return res.json({
      success: true,
      shop: publicShop(shop),
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

    const result = await AuthService.updateUsernameForShop(req.shop, username);
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

    const shop = await Shop.findById(req.shopId);
    await ActivityService.log({
      shopId: shop._id,
      userId: shop.username,
      channel: req.channel || "web",
      action: "auth.username",
      summary: result.message,
      entityType: "shop",
    });

    return res.json({
      success: true,
      shop: publicShop(shop),
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
    return res.json({
      success: true,
      shop: publicShop(shop),
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

    return res.json({
      success: true,
      shop: publicShop(shop),
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

    const shop = req.shop;
    const validOld = await bcrypt.compare(oldPin, shop.pin);
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

    shop.pin = await bcrypt.hash(newPin, 12);
    await shop.save();

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

    await ActivityService.log({
      shopId: (await AuthService.findShopByUsername(username))?._id,
      userId: normalizeUsername(username),
      channel: "web",
      action: "auth.recovery",
      summary: "PIN reset with recovery code",
      entityType: "shop",
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
      userId: req.username,
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

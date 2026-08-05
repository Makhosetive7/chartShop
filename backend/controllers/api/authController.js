import Shop from "../../models/Shop.js";
import AuthService from "../../services/AuthService.js";
import ActivityService from "../../services/ActivityService.js";
import { publicShop, stripMarkdown } from "../../utils/apiResponse.js";
import { normalizeUsername } from "../../utils/channelIdentity.js";

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

/** Enter the shared read-only demo shop without registering. */
export async function enterDemo(req, res) {
  try {
    let shop = await Shop.findOne({ isDemo: true, isActive: true });
    if (!shop) {
      // Fallback for DBs seeded before isDemo existed
      shop = await Shop.findOne({ username: "boutique_demo", isActive: true });
      if (shop && !shop.isDemo) {
        shop.isDemo = true;
        await shop.save();
      }
    }
    if (!shop) {
      return res.status(503).json({
        success: false,
        error:
          "Demo shop is not available yet. Run the boutique demo seed and try again.",
      });
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
      summary: "Entered demo shop on web",
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

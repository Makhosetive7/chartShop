import bcrypt from "bcryptjs";
import Shop from "../../models/Shop.js";
import AuthService from "../../services/AuthService.js";
import ActivityService from "../../services/ActivityService.js";
import { publicShop, stripMarkdown } from "../../utils/apiResponse.js";

export async function login(req, res) {
  try {
    const userId = String(req.body?.userId || "").trim();
    const pin = String(req.body?.pin || "").trim();

    if (!userId || !pin) {
      return res.status(400).json({
        success: false,
        error: "userId and pin are required.",
      });
    }

    const result = await AuthService.login(userId, pin);
    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await ActivityService.log({
      shopId: result.shop?._id,
      userId,
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

export async function logout(req, res) {
  try {
    const result = await AuthService.logout(req.userId);
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

/** One-shot register: same as chat `register "Name" 1234`. */
export async function register(req, res) {
  try {
    const userId = String(req.body?.userId || "").trim();
    const businessName = String(req.body?.businessName || "").trim();
    const pin = String(req.body?.pin || "").trim();
    const businessDescription = String(
      req.body?.businessDescription || "General merchandise"
    ).trim();

    if (!userId || !businessName || !pin) {
      return res.status(400).json({
        success: false,
        error: "userId, businessName, and pin are required.",
      });
    }

    const pinValidation = AuthService.validatePin(pin);
    if (!pinValidation.valid) {
      return res.status(400).json({
        success: false,
        error: pinValidation.message,
      });
    }

    const existing = await Shop.findOne({ telegramId: userId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Account already registered for this userId.",
      });
    }

    const hashedPin = await bcrypt.hash(pin, 12);
    const shop = await Shop.create({
      telegramId: userId,
      businessName,
      businessDescription,
      pin: hashedPin,
      isActive: true,
      registeredAt: new Date(),
    });

    const sessionToken = await AuthService.createLoginSession(
      userId,
      shop._id
    );

    return res.status(201).json({
      success: true,
      token: sessionToken,
      shop: publicShop(shop),
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
    const userId = String(req.query.userId || req.body?.userId || "").trim();
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required.",
      });
    }

    const shop = await Shop.findOne({ telegramId: userId });
    const isAuthenticated = await AuthService.isAuthenticated(userId);
    const regStatus = await AuthService.getRegistrationStatus(userId);

    return res.json({
      success: true,
      registered: Boolean(shop),
      isAuthenticated,
      registrationInProgress: regStatus,
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
    const result = await AuthService.getProfile(req.userId);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }
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

    const result = await AuthService.updateBusinessName(req.userId, name);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    const shop = await Shop.findOne({ telegramId: req.userId });
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

    const result = await AuthService.updateBusinessDescription(
      req.userId,
      description
    );
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    const shop = await Shop.findOne({ telegramId: req.userId });
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
    const oldPin = String(req.body?.oldPin || "").trim();
    const newPin = String(req.body?.newPin || "").trim();

    if (!oldPin || !newPin) {
      return res.status(400).json({
        success: false,
        error: "oldPin and newPin are required.",
      });
    }

    const shop = await Shop.findOne({ telegramId: req.userId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: "Shop not found.",
      });
    }

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

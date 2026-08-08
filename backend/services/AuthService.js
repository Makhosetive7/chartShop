import crypto from "crypto";
import bcrypt from "bcryptjs";
import Shop from "../models/Shop.js";
import User from "../models/User.js";
import RecoveryCode from "../models/RecoveryCode.js";
import SessionStore, {
  SESSION_TTL_MS,
  REGISTRATION_TTL_MS,
  PIN_CHANGE_TTL_MS,
} from "./sessionStore.js";
import {
  normalizeUsername,
  userChannelQuery,
} from "../utils/channelIdentity.js";
import {
  validateUsername as validateUsernamePolicy,
  isUsernameShaped,
  suggestUsernames,
} from "../utils/usernamePolicy.js";
import {
  RECOVERY_CODE_COUNT,
  generateRecoveryCodeBatch,
  hashRecoveryCode,
  normalizeRecoveryCode,
  recoveryCodesMatch,
} from "../utils/recoveryCodes.js";

class AuthService {
  constructor() {
    this.sessionTimeout = SESSION_TTL_MS;
    this.registrationTimeout = REGISTRATION_TTL_MS;
    this.pinChangeTimeout = PIN_CHANGE_TTL_MS;
    this.maxAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000;
  }

  // ==========================================
  // USER / CHANNEL LOOKUP
  // ==========================================

  /**
   * Find by username (includes inactive — use for uniqueness checks).
   * Login paths must also require isActive !== false and removedAt null.
   */
  async findUserByUsername(username) {
    const normalized = normalizeUsername(username);
    if (!normalized) return null;
    return User.findOne({ username: normalized });
  }

  async findUserByChannel(channel, channelKey) {
    const query = userChannelQuery(channel, channelKey);
    if (!query) return null;
    return User.findOne(query);
  }

  /** @deprecated Prefer findUserByUsername — credentials live on User. */
  async findShopByUsername(username) {
    const user = await this.findUserByUsername(username);
    if (!user) return null;
    return Shop.findById(user.shopId);
  }

  /** @deprecated Prefer findUserByChannel — channels live on User. */
  async findShopByChannel(channel, channelKey) {
    const user = await this.findUserByChannel(channel, channelKey);
    if (!user) return null;
    return Shop.findById(user.shopId);
  }

  isUserLoginEligible(user) {
    return Boolean(user && user.isActive !== false && !user.removedAt);
  }

  toPublicUser(user) {
    if (!user) return null;
    const doc = typeof user.toObject === "function" ? user.toObject() : user;
    return {
      id: doc._id != null ? String(doc._id) : null,
      _id: doc._id,
      shopId: doc.shopId != null ? String(doc.shopId) : null,
      username: doc.username,
      displayName: doc.displayName,
      role: doc.role,
      isActive: doc.isActive !== false,
      mustSetPin: Boolean(doc.mustSetPin),
      lastLogin: doc.lastLogin || null,
      createdAt: doc.createdAt || null,
      channels: {
        telegramLinked: Boolean(doc.channels?.telegramChatId),
        whatsappLinked: Boolean(doc.channels?.whatsappPhone),
      },
    };
  }

  /**
   * Bind a messaging channel to a user on first successful credential login.
   * Refuses if this user already has a different chat, or another user owns this chat.
   */
  async bindChannel(user, channel, channelKey) {
    if (channel !== "telegram" && channel !== "whatsapp") {
      return { ok: true, user };
    }

    const key = String(channelKey);
    const field =
      channel === "telegram" ? "telegramChatId" : "whatsappPhone";
    const current = user.channels?.[field];

    if (current && current !== key) {
      return {
        ok: false,
        message:
          `*Channel already linked*\n\n` +
          `This shop is already linked to a different ${channel} account.\n\n` +
          `Log in from the linked chat, or contact support to unlink.`,
      };
    }

    const takenQuery = userChannelQuery(channel, key);
    const taken = await User.findOne({
      ...takenQuery,
      _id: { $ne: user._id },
    });
    if (taken) {
      return {
        ok: false,
        message:
          `*Chat already linked*\n\n` +
          `This ${channel} chat is already linked to another shop (*${taken.username}*).`,
      };
    }

    if (!current) {
      user.channels = user.channels || {};
      user.channels[field] = key;
      await user.save();
    }

    return { ok: true, user };
  }

  async openChannelSession(shop, user, channel, channelKey) {
    const sessionToken = this.generateSessionToken();
    const key = channel === "web" ? sessionToken : String(channelKey);

    await SessionStore.upsertLoginSession({
      channel,
      channelKey: key,
      sessionToken,
      shopId: shop._id,
      userId: user._id,
      loginTime: new Date(),
    });

    return { sessionToken, channelKey: key };
  }

  // ==========================================
  // REGISTRATION
  // ==========================================

  async startRegistration(channel, channelKey) {
    try {
      const linked = await this.findUserByChannel(channel, channelKey);
      if (linked) {
        const shop = await Shop.findById(linked.shopId);
        const businessName = shop?.businessName || "your business";
        return {
          success: false,
          message:
            "*This chat is already linked*\n\n" +
            `Shop: *${businessName}* (@${linked.username})\n\n` +
            "Use `login <username> <pin>` or `login <pin>` to sign in.",
        };
      }

      await SessionStore.upsertRegistration(channel, channelKey, {
        step: "username",
        data: { channel, channelKey: String(channelKey) },
        startTime: new Date(),
      });

      return {
        success: true,
        step: "username",
        message:
          "*Welcome! Let's set up your business*\n\n" +
          "*Step 1 of 4: Username*\n\n" +
          "Choose a username you will use on web, Telegram, and WhatsApp.\n\n" +
          "*Rules:* 3–15 characters, lowercase letters only, optional digits at the end.\n\n" +
          "*Examples:* `musa`, `musa7`, `devking`\n\n" +
          "_(Type your username below)_",
      };
    } catch (error) {
      console.error("[AuthService] Start registration error:", error);
      return {
        success: false,
        message: "Failed to start registration. Please try again.",
      };
    }
  }

  async processRegistrationStep(channel, channelKey, input) {
    try {
      const session = await SessionStore.getRegistration(channel, channelKey);

      if (!session) {
        return {
          success: false,
          message:
            "*Registration session not found*\n\n" +
            "Please start over with /register",
        };
      }

      const started = new Date(session.startTime).getTime();
      if (Date.now() - started > this.registrationTimeout) {
        await SessionStore.deleteRegistration(channel, channelKey);
        return {
          success: false,
          message:
            "*Registration timed out*\n\n" + "Please start over with /register",
        };
      }

      switch (session.step) {
        case "username":
          return await this.handleUsernameStep(channel, channelKey, input, session);
        case "business_name":
          return await this.handleBusinessNameStep(
            channel,
            channelKey,
            input,
            session
          );
        case "business_description":
          return await this.handleBusinessDescriptionStep(
            channel,
            channelKey,
            input,
            session
          );
        case "pin_setup":
          return await this.handlePinSetupStep(
            channel,
            channelKey,
            input,
            session
          );
        default:
          return {
            success: false,
            message:
              "Invalid registration step. Please start over with /register",
          };
      }
    } catch (error) {
      console.error("[AuthService] Process registration error:", error);
      return {
        success: false,
        message: "Something went wrong. Please try again.",
      };
    }
  }

  async handleUsernameStep(channel, channelKey, usernameInput, session) {
    const validation = this.validateUsername(usernameInput);
    if (!validation.valid) {
      const suggestions = await this.suggestAvailableUsernames(usernameInput);
      const suggestionLines =
        suggestions.length > 0
          ? "\n*Try:*\n" +
            suggestions.map((s) => `• \`${s}\``).join("\n") +
            "\n\n"
          : "\n\n";
      return {
        success: false,
        step: "username",
        suggestions,
        message:
          `*${validation.message}*` +
          suggestionLines +
          "_Please enter a valid username:_",
      };
    }

    const username = validation.normalized;
    const existing = await this.findUserByUsername(username);
    if (existing) {
      const suggestions = await this.suggestAvailableUsernames(username);
      const suggestionLines =
        suggestions.length > 0
          ? "\n*Try:*\n" +
            suggestions.map((s) => `• \`${s}\``).join("\n") +
            "\n\n"
          : "\n\n";
      return {
        success: false,
        step: "username",
        suggestions,
        message:
          "*Username already taken*\n\n" +
          `"${username}" is already registered.` +
          suggestionLines +
          "_Please choose a different username:_",
      };
    }

    const nextData = { ...(session.data || {}), username };
    await SessionStore.upsertRegistration(channel, channelKey, {
      step: "business_name",
      data: nextData,
      startTime: session.startTime,
    });

    return {
      success: true,
      step: "business_name",
      message:
        `*"${username}" is available!*\n\n` +
        "*Step 2 of 4: Business Name*\n\n" +
        "What is your business name?\n\n" +
        "*Examples:*\n" +
        "• Mike's Electronics\n" +
        "• City Pharmacy\n" +
        "• Corner Store\n\n" +
        "_(Type your business name below)_",
    };
  }

  async handleBusinessNameStep(channel, channelKey, businessName, session) {
    const trimmedName = businessName.trim();
    const validation = this.validateBusinessName(trimmedName);
    if (!validation.valid) {
      return {
        success: false,
        step: "business_name",
        message: `*${validation.message}*\n\n_Please enter a valid business name:_`,
      };
    }

    const existing = await Shop.findOne({
      businessName: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      return {
        success: false,
        step: "business_name",
        message:
          "*Business name already taken*\n\n" +
          `"${trimmedName}" is already registered.\n\n` +
          "*Try:*\n" +
          `• "${trimmedName} Express"\n` +
          `• "${trimmedName} [Your Area]"\n` +
          `• "[Your Name]'s ${trimmedName}"\n\n` +
          "_Please enter a different name:_",
      };
    }

    const nextData = { ...(session.data || {}), businessName: trimmedName };
    await SessionStore.upsertRegistration(channel, channelKey, {
      step: "business_description",
      data: nextData,
      startTime: session.startTime,
    });

    return {
      success: true,
      step: "business_description",
      message:
        `*"${trimmedName}" is available!*\n\n` +
        "*Step 3 of 4: Business Description*\n\n" +
        "Briefly describe what you sell.\n\n" +
        "*Examples:*\n" +
        "• Electronics and gadgets\n" +
        "• Pharmacy and health products\n" +
        "• General goods and groceries\n\n" +
        "_(Type your description below)_",
    };
  }

  async handleBusinessDescriptionStep(
    channel,
    channelKey,
    description,
    session
  ) {
    const trimmedDescription = description.trim();
    const validation = this.validateBusinessDescription(trimmedDescription);
    if (!validation.valid) {
      return {
        success: false,
        step: "business_description",
        message: `*${validation.message}*\n\n_Please enter a valid description:_`,
      };
    }

    const nextData = {
      ...(session.data || {}),
      businessDescription: trimmedDescription,
    };
    await SessionStore.upsertRegistration(channel, channelKey, {
      step: "pin_setup",
      data: nextData,
      startTime: session.startTime,
    });

    return {
      success: true,
      step: "pin_setup",
      message:
        "*Great description!*\n\n" +
        "*Step 4 of 4: Create PIN*\n\n" +
        "Create a 4-digit PIN to secure your account.\n\n" +
        "*Important:*\n" +
        "• Use exactly 4 digits\n" +
        "• Avoid simple PINs like 1234 or 0000\n" +
        "• Same username + PIN work on web, Telegram, and WhatsApp\n\n" +
        "_(Enter your 4-digit PIN)_",
    };
  }

  async handlePinSetupStep(channel, channelKey, pin, session) {
    const trimmedPin = pin.trim();
    const validation = this.validatePin(trimmedPin);
    if (!validation.valid) {
      return {
        success: false,
        step: "pin_setup",
        message:
          `*${validation.message}*\n\n` +
          "_Please enter a different 4-digit PIN:_",
      };
    }

    const result = await this.registerAccount({
      username: session.data.username,
      businessName: session.data.businessName,
      businessDescription: session.data.businessDescription,
      pin: trimmedPin,
      channel,
      channelKey,
    });

    await SessionStore.deleteRegistration(channel, channelKey);

    if (!result.success) {
      return result;
    }

    const codesBlock = this.formatRecoveryCodesMessage(result.recoveryCodes);
    return {
      success: true,
      completed: true,
      sessionToken: result.sessionToken,
      shop: result.shop,
      user: result.user,
      recoveryCodes: result.recoveryCodes,
      message:
        "*Registration Complete!*\n\n" +
        `Welcome to *${session.data.businessName}*!\n\n` +
        `Username: \`${session.data.username}\`\n\n` +
        "Use this username + PIN on web, Telegram, and WhatsApp.\n\n" +
        codesBlock +
        "*Quick Start:*\n" +
        "• help - See all commands\n\n" +
        "_You're logged in and ready to go!_",
    };
  }

  /**
   * One-shot or API registration. Creates Shop (tenant) + admin User.
   * Optionally binds the current messaging channel on the user.
   */
  async registerAccount({
    username,
    businessName,
    businessDescription = "General merchandise",
    pin,
    channel = null,
    channelKey = null,
    displayName = null,
  }) {
    const usernameValidation = this.validateUsername(username);
    if (!usernameValidation.valid) {
      const suggestions = await this.suggestAvailableUsernames(username);
      return {
        success: false,
        message: usernameValidation.message,
        suggestions,
      };
    }

    const nameValidation = this.validateBusinessName(businessName);
    if (!nameValidation.valid) {
      return { success: false, message: nameValidation.message };
    }

    const descValidation = this.validateBusinessDescription(businessDescription);
    if (!descValidation.valid) {
      return { success: false, message: descValidation.message };
    }

    const pinValidation = this.validatePin(pin);
    if (!pinValidation.valid) {
      return { success: false, message: pinValidation.message };
    }

    const normalized = usernameValidation.normalized;
    const existingUser = await this.findUserByUsername(normalized);
    if (existingUser) {
      const suggestions = await this.suggestAvailableUsernames(normalized);
      return {
        success: false,
        message: "Username already taken.",
        suggestions,
      };
    }

    if (channel && channelKey && channel !== "web") {
      const linked = await this.findUserByChannel(channel, channelKey);
      if (linked) {
        return {
          success: false,
          message: "This chat is already linked to a shop.",
        };
      }
    }

    const hashedPin = await bcrypt.hash(pin, 12);
    const channels = {};
    if (channel === "telegram" && channelKey) {
      channels.telegramChatId = String(channelKey);
    }
    if (channel === "whatsapp" && channelKey) {
      channels.whatsappPhone = String(channelKey);
    }

    const trimmedBusinessName = businessName.trim();
    let shop;
    try {
      shop = await Shop.create({
        businessName: trimmedBusinessName,
        businessDescription: businessDescription.trim(),
        isActive: true,
        registeredAt: new Date(),
        settings: {
          currency: "USD",
          timezone: "Africa/Harare",
          lowStockAlert: 10,
        },
      });
    } catch (error) {
      if (error?.code === 11000) {
        return {
          success: false,
          message: "Business name is already registered.",
        };
      }
      if (error?.name === "ValidationError") {
        const first = Object.values(error.errors || {})[0];
        return {
          success: false,
          message: first?.message || "Invalid shop details.",
        };
      }
      throw error;
    }

    let user;
    try {
      user = await User.create({
        shopId: shop._id,
        username: normalized,
        displayName: (displayName || normalized).trim(),
        pin: hashedPin,
        role: "admin",
        channels,
        isActive: true,
        removedAt: null,
      });
    } catch (error) {
      await Shop.deleteOne({ _id: shop._id }).catch(() => {});
      if (error?.code === 11000) {
        const suggestions = await this.suggestAvailableUsernames(normalized);
        return {
          success: false,
          message: "Username or channel is already registered.",
          suggestions,
        };
      }
      throw error;
    }

    const sessionChannel = channel || "web";
    const { sessionToken } = await this.openChannelSession(
      shop,
      user,
      sessionChannel,
      channelKey
    );

    let recoveryCodes = [];
    try {
      const issued = await this.issueRecoveryCodesForShop(shop, {
        revokeExisting: false,
      });
      recoveryCodes = issued.codes || [];
    } catch (error) {
      console.error("[AuthService] Recovery code issue on register:", error);
    }

    return {
      success: true,
      sessionToken,
      shop: shop.toObject(),
      user: user.toObject(),
      recoveryCodes,
      message: "Registration complete.",
    };
  }

  async getRegistrationStatus(channel, channelKey) {
    const session = await SessionStore.getRegistration(channel, channelKey);
    if (!session) return null;

    const stepNames = {
      username: "Username",
      business_name: "Business Name",
      business_description: "Business Description",
      pin_setup: "PIN Setup",
    };

    const stepNumbers = {
      username: 1,
      business_name: 2,
      business_description: 3,
      pin_setup: 4,
    };

    return {
      currentStep: session.step,
      stepName: stepNames[session.step],
      stepNumber: stepNumbers[session.step],
      totalSteps: 4,
      data: {
        username: session.data.username || null,
        businessName: session.data.businessName || null,
        businessDescription: session.data.businessDescription || null,
      },
    };
  }

  // ==========================================
  // LOGIN / LOGOUT
  // ==========================================

  /**
   * Universal login: username + PIN.
   * Messaging channels bind on first successful login.
   */
  async loginWithCredentials({ username, pin, channel, channelKey }) {
    try {
      const user = await this.findUserByUsername(username);

      const rateLimitCheck = await this.checkRateLimit(user);
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck;
      }

      if (!this.isUserLoginEligible(user)) {
        return {
          success: false,
          message:
            "*Account not found*\n\n" +
            "No shop with that username.\n\n" +
            "New user? Use `register` to create your business.",
        };
      }

      if (user.mustSetPin) {
        return {
          success: false,
          code: "MUST_SET_PIN",
          message:
            "*Set your PIN first*\n\n" +
            "This account was invited. Use your username, setup code, and a new PIN at /setup (or Setup PIN on the login page).",
        };
      }

      const shop = await Shop.findById(user.shopId);
      if (!shop || shop.isActive === false) {
        return {
          success: false,
          message:
            "*Account not found*\n\n" +
            "No shop with that username.\n\n" +
            "New user? Use `register` to create your business.",
        };
      }

      const validPin = await bcrypt.compare(pin, user.pin);
      if (!validPin) {
        await this.recordFailedAttempt(user);
        const attemptsLeft = this.maxAttempts - (user.loginAttempts || 0);
        return {
          success: false,
          message:
            "*Incorrect PIN*\n\n" +
            `${
              attemptsLeft > 0
                ? `${attemptsLeft} attempt${
                    attemptsLeft !== 1 ? "s" : ""
                  } remaining\n\n`
                : ""
            }` +
            "_Please try again._",
        };
      }

      if (channel === "telegram" || channel === "whatsapp") {
        const bind = await this.bindChannel(user, channel, channelKey);
        if (!bind.ok) {
          return { success: false, message: bind.message };
        }
      }

      const { sessionToken } = await this.openChannelSession(
        shop,
        user,
        channel,
        channelKey
      );

      user.lastLogin = new Date();
      user.loginAttempts = 0;
      user.lockedUntil = null;
      await user.save();

      const greeting = this.getTimeBasedGreeting();

      return {
        success: true,
        sessionToken,
        shop: shop.toObject(),
        user: user.toObject(),
        message:
          `${greeting}\n\n` +
          `Welcome back to *${shop.businessName}* (@${user.username})\n\n` +
          "*Quick Actions:*\n" +
          "• sell - Record a sale\n" +
          "• daily - View today's report\n" +
          "• profile - Manage your profile\n" +
          "• help - See all commands",
      };
    } catch (error) {
      console.error("[AuthService] Login error:", error);
      return {
        success: false,
        message: "Login failed. Please try again.",
      };
    }
  }

  /**
   * PIN-only login — only when this channel is already linked to a user.
   */
  async loginWithPinOnly({ pin, channel, channelKey }) {
    const user = await this.findUserByChannel(channel, channelKey);
    if (!user || !this.isUserLoginEligible(user)) {
      return {
        success: false,
        message:
          "*Chat not linked yet*\n\n" +
          "Sign in with your username and PIN to link this chat:\n\n" +
          "`login your_username 1234`",
      };
    }

    return this.loginWithCredentials({
      username: user.username,
      pin,
      channel,
      channelKey,
    });
  }

  /** @deprecated Prefer loginWithCredentials / loginWithPinOnly */
  async login(usernameOrChannelKey, pin, channelCtx) {
    if (channelCtx?.channel) {
      // Accept new + legacy usernames so grandfathered accounts still login.
      if (isUsernameShaped(usernameOrChannelKey)) {
        return this.loginWithCredentials({
          username: usernameOrChannelKey,
          pin,
          channel: channelCtx.channel,
          channelKey: channelCtx.channelKey,
        });
      }
      return this.loginWithPinOnly({
        pin,
        channel: channelCtx.channel,
        channelKey: channelCtx.channelKey,
      });
    }

    // API-style: first arg is username, channel defaults to web
    return this.loginWithCredentials({
      username: usernameOrChannelKey,
      pin,
      channel: "web",
      channelKey: null,
    });
  }

  async logout(channel, channelKey) {
    try {
      const session = await SessionStore.getLoginSession(channel, channelKey);

      if (!session) {
        return {
          success: false,
          message: "*Not logged in*\n\nYou are not currently logged in.",
        };
      }

      const shop = session.shopId
        ? await Shop.findById(session.shopId)
        : null;

      let user = null;
      if (session.userId) {
        user = await User.findById(session.userId);
      } else {
        user = await this.findUserByChannel(channel, channelKey);
      }

      if (user) {
        user.lastLogout = new Date();
        await user.save();
      }

      await SessionStore.deleteLoginSession(channel, channelKey);

      return {
        success: true,
        message:
          "*Logged out successfully!*\n\n" +
          (shop ? `Goodbye from *${shop.businessName}*!\n\n` : "") +
          "Use `login <username> <pin>` to access your account again.",
      };
    } catch (error) {
      console.error("[AuthService] Logout error:", error);
      return {
        success: false,
        message: "Logout failed. Please try again.",
      };
    }
  }

  async logoutByToken(sessionToken) {
    const session = await SessionStore.getLoginSessionByToken(sessionToken);
    if (!session) {
      return {
        success: false,
        message: "Not logged in.",
      };
    }
    return this.logout(session.channel, session.channelKey);
  }

  // ==========================================
  // PROFILE
  // ==========================================

  async getProfile(channel, channelKey) {
    try {
      const user =
        (await this.getAuthenticatedUser(channel, channelKey)) ||
        (await this.findUserByChannel(channel, channelKey));

      if (!user) {
        return {
          success: false,
          message: "*Profile not found*\n\nNo account found for this chat.",
        };
      }

      const shop = await Shop.findById(user.shopId);
      if (!shop) {
        return {
          success: false,
          message: "*Profile not found*\n\nNo account found for this chat.",
        };
      }

      const session = await SessionStore.getLoginSession(channel, channelKey);
      const isLoggedIn = Boolean(session);

      let profileMessage = "*Your Profile*\n\n";
      profileMessage += `*Username:* ${user.username}\n`;
      profileMessage += `*Business Name:* ${shop.businessName}\n`;
      profileMessage += `*Description:* ${
        shop.businessDescription || "Not set"
      }\n`;
      profileMessage += `*PIN:* ${user.pin ? "••••" : "Not set"}\n\n`;
      profileMessage += `*Telegram:* ${
        user.channels?.telegramChatId ? "Linked" : "Not linked"
      }\n`;
      profileMessage += `*WhatsApp:* ${
        user.channels?.whatsappPhone ? "Linked" : "Not linked"
      }\n\n`;
      profileMessage += `*Registered:* ${shop.registeredAt.toLocaleDateString()}\n`;
      profileMessage += `*Last Login:* ${
        user.lastLogin ? this.formatLastLogin(user.lastLogin) : "Never"
      }\n`;
      profileMessage += `*Status:* ${
        isLoggedIn ? "Logged In" : "Logged Out"
      }\n\n`;
      profileMessage += `*Edit Profile:*\n`;
      profileMessage += `• /profile edit name "New Name"\n`;
      profileMessage += `• /profile edit description "New Description"\n`;
      profileMessage += `• /profile edit pin\n`;

      return {
        success: true,
        message: profileMessage,
        profile: {
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          businessName: shop.businessName,
          businessDescription: shop.businessDescription,
          registeredAt: shop.registeredAt,
          lastLogin: user.lastLogin,
          isLoggedIn,
          channels: {
            telegramLinked: Boolean(user.channels?.telegramChatId),
            whatsappLinked: Boolean(user.channels?.whatsappPhone),
          },
        },
      };
    } catch (error) {
      console.error("[AuthService] Get profile error:", error);
      return {
        success: false,
        message: "Failed to fetch business profile. Please try again.",
      };
    }
  }

  async getProfileByShop(shop, { isLoggedIn = true, user = null } = {}) {
    return {
      success: true,
      profile: {
        username: user?.username ?? null,
        displayName: user?.displayName ?? null,
        role: user?.role ?? null,
        businessName: shop.businessName,
        businessDescription: shop.businessDescription,
        registeredAt: shop.registeredAt,
        lastLogin: user?.lastLogin ?? null,
        isLoggedIn,
        channels: {
          telegramLinked: Boolean(user?.channels?.telegramChatId),
          whatsappLinked: Boolean(user?.channels?.whatsappPhone),
        },
      },
    };
  }

  async startPinChange(channel, channelKey) {
    try {
      if (!(await this.isAuthenticated(channel, channelKey))) {
        return {
          success: false,
          message:
            "*Please login first*\n\nUse `login <username> <pin>` to access your account.",
        };
      }

      const user = await this.getAuthenticatedUser(channel, channelKey);
      if (!user) {
        return { success: false, message: "*Profile not found*" };
      }

      await SessionStore.upsertPinChange(channel, channelKey, {
        step: "old_pin",
        startTime: new Date(),
      });

      return {
        success: true,
        step: "old_pin",
        message:
          "*Change PIN*\n\n" +
          "*Step 1 of 2: Enter Current PIN*\n\n" +
          "For security, please enter your current PIN to verify your identity.\n\n" +
          "Type `cancel` to abort",
      };
    } catch (error) {
      console.error("[AuthService] Start PIN change error:", error);
      return {
        success: false,
        message: "Failed to start PIN change. Please try again.",
      };
    }
  }

  async processPinChange(channel, channelKey, input) {
    try {
      const session = await SessionStore.getPinChange(channel, channelKey);

      if (!session) {
        return {
          success: false,
          message:
            "*No PIN change in progress*\n\nUse /profile edit pin to start",
        };
      }

      if (input.toLowerCase().trim() === "cancel") {
        await SessionStore.deletePinChange(channel, channelKey);
        return { success: false, message: "*PIN change cancelled*" };
      }

      const started = new Date(session.startTime).getTime();
      if (Date.now() - started > this.pinChangeTimeout) {
        await SessionStore.deletePinChange(channel, channelKey);
        return {
          success: false,
          message:
            "*PIN change timed out*\n\nPlease start over with /profile edit pin",
        };
      }

      const user = await this.getAuthenticatedUser(channel, channelKey);
      if (!user) {
        await SessionStore.deletePinChange(channel, channelKey);
        return { success: false, message: "*Profile not found*" };
      }

      if (session.step === "old_pin") {
        const oldPin = input.trim();
        if (!/^\d{4}$/.test(oldPin)) {
          return {
            success: false,
            step: "old_pin",
            message:
              "*Invalid PIN format*\n\n" +
              "PIN must be exactly 4 digits.\n\n" +
              "Please enter your current PIN:\n" +
              "Type `cancel` to abort",
          };
        }

        const isValid = await bcrypt.compare(oldPin, user.pin);
        if (!isValid) {
          return {
            success: false,
            step: "old_pin",
            message:
              "*Incorrect PIN*\n\n" +
              "The PIN you entered does not match your current PIN.\n\n" +
              "Please try again or type `cancel` to abort.",
          };
        }

        await SessionStore.upsertPinChange(channel, channelKey, {
          step: "new_pin",
          startTime: session.startTime,
        });

        return {
          success: true,
          step: "new_pin",
          message:
            "*Current PIN Verified*\n\n" +
            "*Step 2 of 2: Enter New PIN*\n\n" +
            "Please choose a new 4-digit PIN.\n\n" +
            "Type `cancel` to abort",
        };
      }

      if (session.step === "new_pin") {
        const newPin = input.trim();
        const validation = this.validatePin(newPin);
        if (!validation.valid) {
          return {
            success: false,
            step: "new_pin",
            message:
              `*${validation.message}*\n\n` +
              "Please choose a different PIN:\n" +
              "Type `cancel` to abort",
          };
        }

        const isSameAsOld = await bcrypt.compare(newPin, user.pin);
        if (isSameAsOld) {
          return {
            success: false,
            step: "new_pin",
            message:
              "*New PIN cannot be the same as old PIN*\n\n" +
              "Please choose a different PIN:\n" +
              "Type `cancel` to abort",
          };
        }

        user.pin = await bcrypt.hash(newPin, 12);
        await user.save();
        await SessionStore.deletePinChange(channel, channelKey);

        return {
          success: true,
          completed: true,
          shop: await Shop.findById(user.shopId).then((s) =>
            s ? s.toObject() : null
          ),
          user: user.toObject(),
          message:
            "*PIN Changed Successfully!*\n\n" +
            "Your new PIN has been saved.\n\n" +
            "Use your new PIN for future logins on all platforms.",
        };
      }

      return {
        success: false,
        message: "*Invalid step in PIN change process*",
      };
    } catch (error) {
      console.error("[AuthService] Process PIN change error:", error);
      await SessionStore.deletePinChange(channel, channelKey);
      return {
        success: false,
        message: "Failed to process PIN change. Please try again.",
      };
    }
  }

  async updateBusinessName(channel, channelKey, newName) {
    try {
      if (!(await this.isAuthenticated(channel, channelKey))) {
        return {
          success: false,
          message:
            "*Please login first*\n\nUse `login <username> <pin>` to access your account.",
        };
      }

      const trimmedName = newName.trim();
      const validation = this.validateBusinessName(trimmedName);
      if (!validation.valid) {
        return { success: false, message: `*${validation.message}*` };
      }

      const shop = await this.getAuthenticatedShop(channel, channelKey);
      if (!shop) {
        return { success: false, message: "*Profile not found*" };
      }

      const existing = await Shop.findOne({
        _id: { $ne: shop._id },
        businessName: new RegExp(`^${trimmedName}$`, "i"),
      });

      if (existing) {
        return {
          success: false,
          message:
            "*Business name already taken*\n\n" +
            `"${trimmedName}" is already registered.\n\n` +
            "Please choose a different name.",
        };
      }

      const oldName = shop.businessName;
      shop.businessName = trimmedName;
      await shop.save();

      return {
        success: true,
        message:
          "*Business Name Updated!*\n\n" +
          `Old Name: ${oldName}\n` +
          `New Name: ${trimmedName}`,
      };
    } catch (error) {
      console.error("[AuthService] Update business name error:", error);
      return {
        success: false,
        message: "Failed to update business name. Please try again.",
      };
    }
  }

  async updateBusinessDescription(channel, channelKey, newDescription) {
    try {
      if (!(await this.isAuthenticated(channel, channelKey))) {
        return {
          success: false,
          message:
            "*Please login first*\n\nUse `login <username> <pin>` to access your account.",
        };
      }

      const trimmedDescription = newDescription.trim();
      const validation = this.validateBusinessDescription(trimmedDescription);
      if (!validation.valid) {
        return { success: false, message: `*${validation.message}*` };
      }

      const shop = await this.getAuthenticatedShop(channel, channelKey);
      if (!shop) {
        return { success: false, message: "*Profile not found*" };
      }

      const oldDescription = shop.businessDescription || "Not set";
      shop.businessDescription = trimmedDescription;
      await shop.save();

      return {
        success: true,
        message:
          "*Business Description Updated!*\n\n" +
          `Old: ${oldDescription}\n` +
          `New: ${trimmedDescription}`,
      };
    } catch (error) {
      console.error("[AuthService] Update description error:", error);
      return {
        success: false,
        message: "Failed to update description. Please try again.",
      };
    }
  }

  /** Profile updates for already-authenticated API (shop document). */
  async updateBusinessNameForShop(shop, newName) {
    const trimmedName = newName.trim();
    const validation = this.validateBusinessName(trimmedName);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const existing = await Shop.findOne({
      _id: { $ne: shop._id },
      businessName: new RegExp(`^${trimmedName}$`, "i"),
    });
    if (existing) {
      return {
        success: false,
        message: "Business name already taken.",
      };
    }

    shop.businessName = trimmedName;
    await shop.save();
    return { success: true, message: "Business name updated.", shop };
  }

  async updateBusinessDescriptionForShop(shop, newDescription) {
    const trimmedDescription = newDescription.trim();
    const validation = this.validateBusinessDescription(trimmedDescription);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    shop.businessDescription = trimmedDescription;
    await shop.save();
    return { success: true, message: "Business description updated.", shop };
  }

  /**
   * Change login username for a user. Sessions stay valid (keyed by shopId + userId).
   */
  async updateUsernameForUser(user, newUsername) {
    if (!user) {
      return { success: false, message: "User required." };
    }

    const shop = await Shop.findById(user.shopId);
    if (shop?.isDemo) {
      return {
        success: false,
        message: "Demo shops cannot change username.",
      };
    }

    const validation = this.validateUsername(newUsername);
    if (!validation.valid) {
      const suggestions = await this.suggestAvailableUsernames(newUsername);
      return {
        success: false,
        message: validation.message,
        suggestions,
      };
    }

    const normalized = validation.normalized;
    if (normalized === normalizeUsername(user.username)) {
      return {
        success: true,
        message: "Username unchanged.",
        user,
        shop,
      };
    }

    const existing = await User.findOne({
      _id: { $ne: user._id },
      username: normalized,
    });
    if (existing) {
      const suggestions = await this.suggestAvailableUsernames(normalized);
      return {
        success: false,
        message: "Username already taken.",
        suggestions,
      };
    }

    const previous = user.username;
    user.username = normalized;
    try {
      await user.save();
    } catch (error) {
      if (error?.code === 11000) {
        const suggestions = await this.suggestAvailableUsernames(normalized);
        return {
          success: false,
          message: "Username already taken.",
          suggestions,
        };
      }
      throw error;
    }

    return {
      success: true,
      message: `Username updated from @${previous} to @${normalized}.`,
      user,
      shop,
      previousUsername: previous,
    };
  }

  /** @deprecated Prefer updateUsernameForUser */
  async updateUsernameForShop(shop, newUsername) {
    if (!shop?._id) {
      return { success: false, message: "Shop required." };
    }
    const user = await User.findOne({
      shopId: shop._id,
      role: "admin",
      isActive: { $ne: false },
      removedAt: null,
    }).sort({ createdAt: 1 });
    if (!user) {
      return { success: false, message: "No active admin user found." };
    }
    const result = await this.updateUsernameForUser(user, newUsername);
    if (result.success) {
      return {
        ...result,
        shop: result.shop || shop,
      };
    }
    return result;
  }

  async updateUsername(channel, channelKey, newUsername) {
    try {
      if (!(await this.isAuthenticated(channel, channelKey))) {
        return {
          success: false,
          message:
            "*Please login first*\n\nUse `login <username> <pin>` to access your account.",
        };
      }

      const user = await this.getAuthenticatedUser(channel, channelKey);
      if (!user) {
        return { success: false, message: "*Profile not found*" };
      }

      const shop = await Shop.findById(user.shopId);
      if (shop?.isDemo) {
        return {
          success: false,
          message: "*Demo shops cannot change username.*",
        };
      }

      const result = await this.updateUsernameForUser(user, newUsername);
      if (!result.success) {
        const suggestionLines =
          result.suggestions?.length > 0
            ? "\n\n*Try:*\n" +
              result.suggestions.map((s) => `• \`${s}\``).join("\n")
            : "";
        return {
          success: false,
          suggestions: result.suggestions,
          message: `*${result.message}*${suggestionLines}`,
        };
      }

      if (!result.previousUsername) {
        return {
          success: true,
          shop: result.shop,
          user: result.user,
          message: "*Username unchanged.*",
        };
      }

      return {
        success: true,
        shop: result.shop,
        user: result.user,
        message:
          "*Username Updated!*\n\n" +
          `Old: \`@${result.previousUsername}\`\n` +
          `New: \`@${result.user.username}\`\n\n` +
          "Use the new username with your PIN on web, Telegram, and WhatsApp.",
      };
    } catch (error) {
      console.error("[AuthService] Update username error:", error);
      return {
        success: false,
        message: "Failed to update username. Please try again.",
      };
    }
  }

  async getPinChangeStatus(channel, channelKey) {
    const session = await SessionStore.getPinChange(channel, channelKey);
    if (!session) return null;

    return {
      step: session.step,
      stepNumber: session.step === "old_pin" ? 1 : 2,
      totalSteps: 2,
      stepName:
        session.step === "old_pin" ? "Verify Current PIN" : "Enter New PIN",
    };
  }

  // ==========================================
  // TEAM
  // ==========================================

  async listTeamMembers(shopId) {
    if (!shopId) return [];
    const users = await User.find({
      shopId,
      isActive: { $ne: false },
      removedAt: null,
    })
      .sort({ role: 1, createdAt: 1 })
      .lean();

    return users.map((u) => this.toPublicUser(u));
  }

  /**
   * Add a team member. Admin-only is enforced by the controller.
   * Default role is member. Demo shops cannot add members.
   * If `pin` is omitted, issues a one-time setup code (mustSetPin).
   */
  async addTeamMember({
    shopId,
    username,
    pin = null,
    displayName,
    role = "member",
  }) {
    if (!shopId) {
      return { success: false, message: "Shop required." };
    }

    const shop = await Shop.findById(shopId);
    if (!shop || shop.isActive === false) {
      return { success: false, message: "Shop not found." };
    }
    if (shop.isDemo) {
      return {
        success: false,
        message: "Demo shops cannot add team members.",
      };
    }

    const memberRole = role === "admin" ? "admin" : "member";

    const usernameValidation = this.validateUsername(username);
    if (!usernameValidation.valid) {
      const suggestions = await this.suggestAvailableUsernames(username);
      return {
        success: false,
        message: usernameValidation.message,
        suggestions,
      };
    }

    const trimmedPin =
      pin != null && String(pin).trim() !== "" ? String(pin).trim() : null;
    if (trimmedPin) {
      const pinValidation = this.validatePin(trimmedPin);
      if (!pinValidation.valid) {
        return { success: false, message: pinValidation.message };
      }
    }

    const trimmedDisplay =
      typeof displayName === "string" ? displayName.trim() : "";
    if (!trimmedDisplay || trimmedDisplay.length < 1) {
      return { success: false, message: "Display name is required." };
    }
    if (trimmedDisplay.length > 50) {
      return {
        success: false,
        message: "Display name must be 50 characters or less.",
      };
    }

    const normalized = usernameValidation.normalized;
    const existing = await this.findUserByUsername(normalized);
    if (existing) {
      const suggestions = await this.suggestAvailableUsernames(normalized);
      return {
        success: false,
        message: "Username already taken.",
        suggestions,
      };
    }

    let setupCode = null;
    let hashedPin;
    let mustSetPin = false;
    let setupCodeHash = null;

    if (trimmedPin) {
      hashedPin = await bcrypt.hash(trimmedPin, 12);
    } else {
      mustSetPin = true;
      setupCode = this.generateSetupCode();
      setupCodeHash = hashRecoveryCode(normalizeRecoveryCode(setupCode));
      // Unusable placeholder until they complete setup-pin.
      hashedPin = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
    }

    let user;
    try {
      user = await User.create({
        shopId: shop._id,
        username: normalized,
        displayName: trimmedDisplay,
        pin: hashedPin,
        role: memberRole,
        channels: {},
        isActive: true,
        removedAt: null,
        mustSetPin,
        setupCodeHash,
      });
    } catch (error) {
      if (error?.code === 11000) {
        const suggestions = await this.suggestAvailableUsernames(normalized);
        return {
          success: false,
          message: "Username already taken.",
          suggestions,
        };
      }
      throw error;
    }

    return {
      success: true,
      user: this.toPublicUser(user),
      setupCode: setupCode || undefined,
      message: setupCode
        ? `Added @${normalized} as ${memberRole}. Share the setup code once so they can set their PIN.`
        : `Added @${normalized} as ${memberRole}.`,
    };
  }

  generateSetupCode() {
    // Same shape family as recovery codes for familiarity: cs-xxxx-xxxx
    const raw = crypto.randomBytes(4).toString("hex");
    return `cs-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  }

  /**
   * Admin: issue a fresh one-time setup code for a pending invite (mustSetPin).
   * Invalidates any previous code. Does not work after the member has set a PIN.
   */
  async regenerateSetupCode({ shopId, userId, actingUserId }) {
    if (!shopId || !userId) {
      return { success: false, message: "shopId and userId are required." };
    }

    const shop = await Shop.findById(shopId);
    if (!shop || shop.isActive === false) {
      return { success: false, message: "Shop not found." };
    }
    if (shop.isDemo) {
      return {
        success: false,
        message: "Demo shops cannot regenerate setup codes.",
      };
    }

    const user = await User.findOne({ _id: userId, shopId });
    if (!user || user.isActive === false || user.removedAt) {
      return { success: false, message: "Team member not found." };
    }

    if (!user.mustSetPin) {
      return {
        success: false,
        message:
          "This member already set a PIN. They can sign in or use a recovery code if locked out.",
      };
    }

    if (
      actingUserId &&
      String(actingUserId) === String(user._id)
    ) {
      return {
        success: false,
        message: "Ask another admin to regenerate your setup code.",
      };
    }

    const setupCode = this.generateSetupCode();
    user.setupCodeHash = hashRecoveryCode(normalizeRecoveryCode(setupCode));
    user.mustSetPin = true;
    user.loginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    return {
      success: true,
      user: this.toPublicUser(user),
      setupCode,
      message: `New setup code for @${user.username}. Share it once — the old code no longer works.`,
    };
  }

  /**
   * Complete invite: username + one-time setup code → set PIN and enable login.
   */
  async completePinSetup({ username, setupCode, newPin }) {
    const normalizedUser = normalizeUsername(username);
    const normalizedCode = normalizeRecoveryCode(setupCode);

    if (!normalizedUser || !normalizedCode) {
      return {
        success: false,
        message: "username and setup code are required.",
      };
    }

    const pinValidation = this.validatePin(newPin);
    if (!pinValidation.valid) {
      return { success: false, message: pinValidation.message };
    }

    const user = await this.findUserByUsername(normalizedUser);
    if (!user || !this.isUserLoginEligible(user)) {
      return {
        success: false,
        message: "Invalid username or setup code.",
      };
    }

    if (!user.mustSetPin || !user.setupCodeHash) {
      return {
        success: false,
        message: "This account does not need a setup code. Sign in with your PIN.",
      };
    }

    const rateLimitCheck = await this.checkRateLimit(user);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        message:
          rateLimitCheck.message?.replace(/\*/g, "") ||
          "Too many attempts. Try again later.",
      };
    }

    const codeHash = hashRecoveryCode(normalizedCode);
    if (!recoveryCodesMatch(user.setupCodeHash, codeHash)) {
      await this.recordFailedAttempt(user);
      return {
        success: false,
        message: "Invalid username or setup code.",
      };
    }

    const shop = await Shop.findById(user.shopId);
    if (!shop || shop.isActive === false) {
      return { success: false, message: "Shop not found." };
    }

    user.pin = await bcrypt.hash(String(newPin).trim(), 12);
    user.mustSetPin = false;
    user.setupCodeHash = null;
    user.loginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    return {
      success: true,
      message: "PIN set. You can sign in with your username and new PIN.",
      user: this.toPublicUser(user),
      shop: shop.toObject(),
    };
  }

  /**
   * Soft-deactivate a team member. Clears channels and ends their sessions.
   * Refuses if they are the last active admin.
   */
  async deactivateTeamMember({ shopId, userId, actingUserId }) {
    if (!shopId || !userId) {
      return { success: false, message: "shopId and userId are required." };
    }

    const user = await User.findOne({ _id: userId, shopId });
    if (!user || user.isActive === false || user.removedAt) {
      return { success: false, message: "Team member not found." };
    }

    if (actingUserId && String(user._id) === String(actingUserId)) {
      return {
        success: false,
        message: "You cannot deactivate your own account.",
      };
    }

    if (user.role === "admin") {
      const otherAdmins = await User.countDocuments({
        shopId,
        role: "admin",
        isActive: { $ne: false },
        removedAt: null,
        _id: { $ne: user._id },
      });
      if (otherAdmins === 0) {
        return {
          success: false,
          message: "Cannot deactivate the last active admin.",
        };
      }
    }

    user.isActive = false;
    user.removedAt = new Date();
    user.channels = {
      telegramChatId: null,
      whatsappPhone: null,
    };
    await user.save();
    await SessionStore.deleteLoginSessionsByUserId(user._id);

    return {
      success: true,
      user: this.toPublicUser(user),
      message: `Deactivated @${user.username}.`,
    };
  }

  /**
   * Change a team member's role (admin ↔ member).
   * Refuses demoting the last active admin.
   */
  async setTeamMemberRole({ shopId, userId, role, actingUserId }) {
    if (!shopId || !userId) {
      return { success: false, message: "shopId and userId are required." };
    }
    const nextRole = role === "admin" ? "admin" : "member";
    const user = await User.findOne({ _id: userId, shopId });
    if (!user || user.isActive === false || user.removedAt) {
      return { success: false, message: "Team member not found." };
    }

    if (user.role === nextRole) {
      return {
        success: true,
        user: this.toPublicUser(user),
        message: `@${user.username} is already ${nextRole}.`,
      };
    }

    if (user.role === "admin" && nextRole === "member") {
      const otherAdmins = await User.countDocuments({
        shopId,
        role: "admin",
        isActive: { $ne: false },
        removedAt: null,
        _id: { $ne: user._id },
      });
      if (otherAdmins === 0) {
        return {
          success: false,
          message: "Cannot demote the last active admin.",
        };
      }
      if (actingUserId && String(user._id) === String(actingUserId)) {
        return {
          success: false,
          message: "Promote another admin before demoting yourself.",
        };
      }
    }

    user.role = nextRole;
    await user.save();
    return {
      success: true,
      user: this.toPublicUser(user),
      message: `Updated @${user.username} to ${nextRole}.`,
    };
  }

  /** Update own (or admin-managed) display name. */
  async updateDisplayNameForUser(user, displayName) {
    if (!user) {
      return { success: false, message: "User required." };
    }
    const trimmed =
      typeof displayName === "string" ? displayName.trim() : "";
    if (!trimmed || trimmed.length < 1) {
      return { success: false, message: "Display name is required." };
    }
    if (trimmed.length > 50) {
      return {
        success: false,
        message: "Display name must be 50 characters or less.",
      };
    }
    user.displayName = trimmed;
    await user.save();
    return {
      success: true,
      user: this.toPublicUser(user),
      message: "Display name updated.",
    };
  }

  // ==========================================
  // SESSION
  // ==========================================

  async isAuthenticated(channel, channelKey) {
    const session = await SessionStore.getLoginSession(channel, channelKey);
    if (!session) return false;

    const now = Date.now();
    const lastActivity = new Date(
      session.lastActivity || session.loginTime
    ).getTime();

    if (now - lastActivity > this.sessionTimeout) {
      await SessionStore.deleteLoginSession(channel, channelKey);
      return false;
    }

    return true;
  }

  /**
   * Create a login session for shop + user on a channel.
   * @param {object} shop
   * @param {object} user
   * @param {string} channel
   * @param {string|null} channelKey
   */
  async createLoginSession(shop, user, channel, channelKey) {
    if (!shop?._id) throw new Error("Shop not found");
    if (!user?._id) throw new Error("User not found");
    const { sessionToken } = await this.openChannelSession(
      shop,
      user,
      channel,
      channelKey
    );
    return sessionToken;
  }

  async updateActivity(channel, channelKey) {
    await SessionStore.touchLoginSession(channel, channelKey);
  }

  async getAuthenticatedShop(channel, channelKey) {
    if (!(await this.isAuthenticated(channel, channelKey))) {
      return null;
    }
    const session = await SessionStore.getLoginSession(channel, channelKey);
    if (!session?.shopId) return null;
    return Shop.findById(session.shopId);
  }

  async getAuthenticatedUser(channel, channelKey) {
    if (!(await this.isAuthenticated(channel, channelKey))) {
      return null;
    }
    const session = await SessionStore.getLoginSession(channel, channelKey);
    if (!session?.userId) return null;
    const user = await User.findById(session.userId);
    if (!this.isUserLoginEligible(user)) return null;
    return user;
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  validateUsername(username) {
    return validateUsernamePolicy(username);
  }

  async suggestAvailableUsernames(desired, count = 3) {
    return suggestUsernames(
      desired,
      async (candidate) => Boolean(await this.findUserByUsername(candidate)),
      count
    );
  }

  /**
   * Real-time availability check for registration UIs.
   * @returns {{ available: boolean, username: string, valid: boolean, message?: string, suggestions?: string[] }}
   */
  async checkUsernameAvailability(usernameInput, { excludeUserId } = {}) {
    const normalized = normalizeUsername(usernameInput);
    const validation = this.validateUsername(usernameInput);

    if (!validation.valid) {
      const suggestions = await this.suggestAvailableUsernames(
        normalized || usernameInput
      );
      return {
        available: false,
        valid: false,
        username: normalized,
        message: validation.message,
        suggestions,
      };
    }

    const username = validation.normalized;
    const existing = await this.findUserByUsername(username);
    const isSelf =
      existing &&
      excludeUserId &&
      String(existing._id) === String(excludeUserId);

    if (existing && !isSelf) {
      const suggestions = await this.suggestAvailableUsernames(username);
      return {
        available: false,
        valid: true,
        username,
        message: "Username already taken.",
        suggestions,
      };
    }

    return {
      available: true,
      valid: true,
      username,
      suggestions: [],
    };
  }

  validateBusinessName(name) {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: "Business name cannot be empty" };
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return {
        valid: false,
        message: "Business name must be at least 2 characters",
      };
    }
    if (trimmed.length > 50) {
      return {
        valid: false,
        message: "Business name must be less than 50 characters",
      };
    }
    return { valid: true };
  }

  validateBusinessDescription(description) {
    if (!description || description.trim().length === 0) {
      return { valid: false, message: "Description cannot be empty" };
    }
    const trimmed = description.trim();
    if (trimmed.length > 500) {
      return {
        valid: false,
        message: "Description must be less than 500 characters",
      };
    }
    return { valid: true };
  }

  validatePin(pin) {
    if (!/^\d{4}$/.test(pin)) {
      return { valid: false, message: "PIN must be exactly 4 digits" };
    }

    const weakPatterns = [
      "0000",
      "1111",
      "2222",
      "3333",
      "4444",
      "5555",
      "6666",
      "7777",
      "8888",
      "9999",
      "1234",
      "4321",
      "0123",
      "3210",
    ];

    if (weakPatterns.includes(pin)) {
      return {
        valid: false,
        message: "PIN is too simple. Please choose a stronger PIN",
      };
    }

    return { valid: true };
  }

  // ==========================================
  // RATE LIMITING
  // ==========================================

  async checkRateLimit(user) {
    if (!user) return { allowed: true };

    const now = new Date();

    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingMs = user.lockedUntil.getTime() - now.getTime();
      const remainingMin = Math.ceil(remainingMs / 60000);

      return {
        allowed: false,
        success: false,
        message:
          "*Account Temporarily Locked*\n\n" +
          `Too many failed login attempts.\n\n` +
          `Try again in ${remainingMin} minute${
            remainingMin !== 1 ? "s" : ""
          }.`,
      };
    }

    if (user.lockedUntil && user.lockedUntil <= now) {
      user.loginAttempts = 0;
      user.lockedUntil = null;
      await user.save();
    }

    return { allowed: true };
  }

  async recordFailedAttempt(user) {
    if (!user) return;

    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= this.maxAttempts) {
      user.lockedUntil = new Date(Date.now() + this.lockoutDuration);
    }
    await user.save();
  }

  // ==========================================
  // UTILITY
  // ==========================================

  generateSessionToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    if (hour < 21) return "Good evening!";
    return "Good night!";
  }

  formatLastLogin(lastLogin) {
    const now = new Date();
    const diff = now - new Date(lastLogin);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
    return lastLogin.toLocaleDateString();
  }

  // ==========================================
  // RECOVERY CODES
  // ==========================================

  formatRecoveryCodesMessage(codes) {
    if (!codes?.length) {
      return (
        "*Recovery codes:* unavailable — generate them in Settings on the web.\n\n"
      );
    }
    const list = codes.map((c) => `• \`${c}\``).join("\n");
    return (
      "*Save these recovery codes now*\n" +
      "They are shown *once*. If you lose your PIN and these codes, the account may be unrecoverable.\n\n" +
      `${list}\n\n` +
      "_Screenshot and store them offline, then delete this message if you can._\n\n" +
      "Reset later: `recover yourusername cs-xxxx-xxxx 1234`\n\n"
    );
  }

  /**
   * Issue a new recovery-code batch. Plaintext returned once; only hashes stored.
   * @returns {{ success: boolean, codes?: string[], remaining?: number, message?: string }}
   */
  async issueRecoveryCodesForShop(shop, { revokeExisting = true } = {}) {
    if (!shop?._id) {
      return { success: false, message: "Shop required." };
    }
    if (shop.isDemo) {
      return { success: false, message: "Demo shops cannot use recovery codes." };
    }

    if (revokeExisting) {
      await RecoveryCode.updateMany(
        { shopId: shop._id, usedAt: null, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    const batchId = crypto.randomBytes(12).toString("hex");
    const codes = generateRecoveryCodeBatch(RECOVERY_CODE_COUNT);
    const docs = codes.map((plain) => ({
      shopId: shop._id,
      codeHash: hashRecoveryCode(plain),
      batchId,
      createdAt: new Date(),
      usedAt: null,
      revokedAt: null,
    }));

    await RecoveryCode.insertMany(docs);

    return {
      success: true,
      codes,
      remaining: codes.length,
      batchId,
      message: "Recovery codes generated. Save them now — they will not be shown again.",
    };
  }

  async getRecoveryCodeStatus(shopId) {
    if (!shopId) {
      return { hasCodes: false, remaining: 0, totalUnused: 0 };
    }
    const remaining = await RecoveryCode.countDocuments({
      shopId,
      usedAt: null,
      revokedAt: null,
    });
    const latest = await RecoveryCode.findOne({ shopId })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    return {
      hasCodes: remaining > 0,
      remaining,
      lastIssuedAt: latest?.createdAt || null,
    };
  }

  /**
   * Redeem one recovery code to set a new PIN for that username's user.
   * Invalidates that user's sessions.
   */
  async redeemRecoveryCode({ username, code, newPin }) {
    const normalizedUser = normalizeUsername(username);
    const normalizedCode = normalizeRecoveryCode(code);

    if (!normalizedUser || !normalizedCode) {
      return {
        success: false,
        message: "username and recovery code are required.",
      };
    }

    const pinValidation = this.validatePin(newPin);
    if (!pinValidation.valid) {
      return { success: false, message: pinValidation.message };
    }

    const user = await this.findUserByUsername(normalizedUser);
    if (!this.isUserLoginEligible(user)) {
      return {
        success: false,
        message: "Invalid username or recovery code.",
      };
    }

    const shop = await Shop.findById(user.shopId);
    if (!shop || shop.isActive === false) {
      return {
        success: false,
        message: "Invalid username or recovery code.",
      };
    }

    if (shop.isDemo) {
      return {
        success: false,
        message: "Demo shops cannot recover with codes.",
      };
    }

    const rateLimitCheck = await this.checkRateLimit(user);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        message: rateLimitCheck.message?.replace(/\*/g, "") || "Too many attempts. Try again later.",
      };
    }

    const candidates = await RecoveryCode.find({
      shopId: shop._id,
      usedAt: null,
      revokedAt: null,
    });

    const codeHash = hashRecoveryCode(normalizedCode);
    let matched = null;
    for (const row of candidates) {
      if (recoveryCodesMatch(row.codeHash, codeHash)) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      await this.recordFailedAttempt(user);
      return {
        success: false,
        message: "Invalid username or recovery code.",
      };
    }

    matched.usedAt = new Date();
    await matched.save();

    user.pin = await bcrypt.hash(String(newPin).trim(), 12);
    await user.resetLoginAttempts();

    await SessionStore.deleteLoginSessionsByUserId(user._id);

    const remaining = await RecoveryCode.countDocuments({
      shopId: shop._id,
      usedAt: null,
      revokedAt: null,
    });

    return {
      success: true,
      remaining,
      mustRegenerate: remaining === 0,
      message:
        remaining > 0
          ? `PIN reset. ${remaining} recovery code${remaining === 1 ? "" : "s"} left. Sign in with your new PIN. Consider regenerating codes in Settings.`
          : "PIN reset. You have no recovery codes left — sign in and generate a new set in Settings.",
    };
  }
}

export default new AuthService();

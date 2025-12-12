import crypto from "crypto";
import bcrypt from "bcryptjs";
import Shop from "../models/Shop.js";

class AuthService {
  constructor() {
    // Session management
    this.activeSessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    // Registration tracking
    this.registrationSessions = new Map();
    this.registrationTimeout = 15 * 60 * 1000; // 15 minutes

    // PIN change tracking
    this.pinChangeSessions = new Map();
    this.pinChangeTimeout = 10 * 60 * 1000; // 10 minutes

    // Rate limiting for login attempts
    this.loginAttempts = new Map();
    this.maxAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes

    // Start cleanup intervals
    this.startCleanupIntervals();
  }

  /**
   * Start registration process
   */
  async startRegistration(telegramId, userData = {}) {
    try {
      const existingShop = await Shop.findOne({ telegramId });
      if (existingShop) {
        return {
          success: false,
          message:
            "*You already have an account!*\n\n" +
            `Business: ${existingShop.businessName}\n\n` +
            "Use /login to access your account.",
        };
      }

      this.registrationSessions.set(telegramId, {
        step: "business_name",
        data: { telegramId },
        startTime: Date.now(),
      });

      return {
        success: true,
        step: "business_name",
        message:
          "*Welcome! Let's set up your business*\n\n" +
          "*Step 1 of 3: Business Name*\n\n" +
          "What is your business name?\n\n" +
          "*Examples:*\n" +
          "• Mike's Electronics\n" +
          "• City Pharmacy\n" +
          "• Corner Store\n\n" +
          "_(Type your business name below)_",
      };
    } catch (error) {
      console.error("[AuthService] Start registration error:", error);
      return {
        success: false,
        message: "Failed to start registration. Please try again.",
      };
    }
  }

  /**
   * Process registration steps
   */
  async processRegistrationStep(telegramId, input) {
    try {
      const session = this.registrationSessions.get(telegramId);

      if (!session) {
        return {
          success: false,
          message:
            "*Registration session not found*\n\n" +
            "Please start over with /register",
        };
      }

      // Check timeout
      if (Date.now() - session.startTime > this.registrationTimeout) {
        this.registrationSessions.delete(telegramId);
        return {
          success: false,
          message:
            "*Registration timed out*\n\n" + "Please start over with /register",
        };
      }

      switch (session.step) {
        case "business_name":
          return await this.handleBusinessNameStep(telegramId, input, session);

        case "business_description":
          return await this.handleBusinessDescriptionStep(
            telegramId,
            input,
            session
          );

        case "pin_setup":
          return await this.handlePinSetupStep(telegramId, input, session);

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

  /**
   * Step 1: Business Name
   */
  async handleBusinessNameStep(telegramId, businessName, session) {
    const trimmedName = businessName.trim();

    // Validate business name
    const validation = this.validateBusinessName(trimmedName);
    if (!validation.valid) {
      return {
        success: false,
        step: "business_name",
        message: `❌ *${validation.message}*\n\n_Please enter a valid business name:_`,
      };
    }

    // Check if name already exists
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

    // Save and proceed to next step
    session.data.businessName = trimmedName;
    session.step = "business_description";
    this.registrationSessions.set(telegramId, session);

    return {
      success: true,
      step: "business_description",
      message:
        `*"${trimmedName}" is available!*\n\n` +
        "*Step 2 of 3: Business Description*\n\n" +
        "Briefly describe what you sell.\n\n" +
        "*Examples:*\n" +
        "• Electronics and gadgets\n" +
        "• Pharmacy and health products\n" +
        "• General goods and groceries\n" +
        "• Clothing and accessories\n\n" +
        "_(Type your description below)_",
    };
  }

  /**
   * Step 2: Business Description
   */
  async handleBusinessDescriptionStep(telegramId, description, session) {
    const trimmedDescription = description.trim();

    // Validate description
    const validation = this.validateBusinessDescription(trimmedDescription);
    if (!validation.valid) {
      return {
        success: false,
        step: "business_description",
        message: `*${validation.message}*\n\n_Please enter a valid description:_`,
      };
    }

    // Save and proceed to PIN setup
    session.data.businessDescription = trimmedDescription;
    session.step = "pin_setup";
    this.registrationSessions.set(telegramId, session);

    return {
      success: true,
      step: "pin_setup",
      message:
        "*Great description!*\n\n" +
        "*Step 3 of 3: Create PIN*\n\n" +
        "Create a 4-digit PIN to secure your account.\n\n" +
        "*Important:*\n" +
        "• Use exactly 4 digits\n" +
        "• Avoid simple PINs like 1234 or 0000\n" +
        "• Remember this PIN - you'll need it to login\n\n" +
        "_(Enter your 4-digit PIN)_",
    };
  }

  /**
   * Step 3: PIN Setup and Complete Registration
   */
  async handlePinSetupStep(telegramId, pin, session) {
    const trimmedPin = pin.trim();

    // Validate PIN
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

    // Hash the PIN
    const hashedPin = await bcrypt.hash(trimmedPin, 12);

    // Create the shop
    const shop = new Shop({
      telegramId: session.data.telegramId,
      businessName: session.data.businessName,
      businessDescription: session.data.businessDescription,
      pin: hashedPin,
      isActive: true,
      registeredAt: new Date(),
      settings: {
        currency: "USD",
        timezone: "Africa/Harare",
        lowStockAlert: 10,
      },
    });

    await shop.save();

    // Clear registration session
    this.registrationSessions.delete(telegramId);

    // Auto-login
    const sessionToken = this.generateSessionToken();
    this.activeSessions.set(telegramId, {
      sessionToken,
      loginTime: new Date(),
      lastActivity: new Date(),
      shopId: shop._id,
    });

    return {
      success: true,
      completed: true,
      message:
        "🎉 *Registration Complete!*\n\n" +
        `Welcome to *${session.data.businessName}*!\n\n` +
        "*Quick Start:*\n" +
        "• /help - See all commands\n\n" +
        "_You're now logged in and ready to go!_",
      shop: shop.toObject(),
    };
  }

  /**
   * Get registration status
   */
  getRegistrationStatus(telegramId) {
    const session = this.registrationSessions.get(telegramId);
    if (!session) return null;

    const stepNames = {
      business_name: "Business Name",
      business_description: "Business Description",
      pin_setup: "PIN Setup",
    };

    const stepNumbers = {
      business_name: 1,
      business_description: 2,
      pin_setup: 3,
    };

    return {
      currentStep: session.step,
      stepName: stepNames[session.step],
      stepNumber: stepNumbers[session.step],
      totalSteps: 3,
      data: {
        businessName: session.data.businessName || null,
        businessDescription: session.data.businessDescription || null,
      },
    };
  }

  /**
   * Login with PIN
   */
  async login(telegramId, pin) {
    try {
      // Check rate limiting
      const rateLimitCheck = this.checkRateLimit(telegramId);
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck;
      }

      // Find shop
      const shop = await Shop.findOne({ telegramId });
      if (!shop) {
        this.recordFailedAttempt(telegramId);
        return {
          success: false,
          message:
            "*Account not found*\n\n" +
            "No business registered with this Telegram account.\n\n" +
            "New user? Use /register to create your business.",
        };
      }

      // Verify PIN
      const validPin = await bcrypt.compare(pin, shop.pin);
      if (!validPin) {
        this.recordFailedAttempt(telegramId);
        const attempts = this.loginAttempts.get(telegramId);
        const attemptsLeft = this.maxAttempts - (attempts?.count || 0);

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

      // Success - clear failed attempts
      this.loginAttempts.delete(telegramId);

      // Create session
      const sessionToken = this.generateSessionToken();
      this.activeSessions.set(telegramId, {
        sessionToken,
        loginTime: new Date(),
        lastActivity: new Date(),
        shopId: shop._id,
      });

      // Update shop
      shop.lastLogin = new Date();
      shop.loginAttempts = 0;
      shop.lockedUntil = null;
      await shop.save();

      // Get greeting
      const greeting = this.getTimeBasedGreeting();

      return {
        success: true,
        message:
          `${greeting}\n\n` +
          `Welcome back to *${shop.businessName}*\n\n` +
          `Last login: ${
            shop.lastLogin ? this.formatLastLogin(shop.lastLogin) : "First time"
          }\n\n` +
          "*Quick Actions:*\n" +
          "• /sell - Record a sale\n" +
          "• /daily - View today's report\n" +
          "• /profile - Manage your profile\n" +
          "• /help - See all commands",
        shop: shop.toObject(),
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
   * Logout
   */
  async logout(telegramId) {
    try {
      const session = this.activeSessions.get(telegramId);

      if (!session) {
        return {
          success: false,
          message: "*Not logged in*\n\nYou are not currently logged in.",
        };
      }

      const shop = await Shop.findOne({ telegramId });
      if (shop) {
        shop.lastLogout = new Date();
        shop.isActive = false;
        await shop.save();
      }

      this.activeSessions.delete(telegramId);

      return {
        success: true,
        message:
          "*Logged out successfully!*\n\n" +
          (shop ? `Goodbye from *${shop.businessName}*!\n\n` : "") +
          "Use /login to access your account again.",
      };
    } catch (error) {
      console.error("[AuthService] Logout error:", error);
      return {
        success: false,
        message: "Logout failed. Please try again.",
      };
    }
  }

  /**
   * Get business profile data
   */
  async getProfile(telegramId) {
    try {
      const shop = await Shop.findOne({ telegramId });

      if (!shop) {
        return {
          success: false,
          message: "*Profile not found*\n\nNo account found for this user.",
        };
      }

      const session = this.activeSessions.get(telegramId);
      const isLoggedIn = session ? true : false;

      let profileMessage = "*Your Profile*\n\n";
      profileMessage += `*Business Name:* ${shop.businessName}\n`;
      profileMessage += `*Description:* ${
        shop.businessDescription || "Not set"
      }\n`;
      profileMessage += `*PIN:* ${shop.pin ? "••••" : "Not set"}\n\n`;

      profileMessage += `*Registered:* ${shop.registeredAt.toLocaleDateString()}\n`;
      profileMessage += `*Last Login:* ${
        shop.lastLogin ? this.formatLastLogin(shop.lastLogin) : "Never"
      }\n`;
      profileMessage += `*Status:* ${
        isLoggedIn ? "Logged In" : "Logged Out"
      }\n\n`;

      if (shop.settings?.currency) {
        profileMessage += `*Currency:* ${shop.settings.currency}\n`;
      }
      if (shop.settings?.timezone) {
        profileMessage += `*Timezone:* ${shop.settings.timezone}\n`;
      }

      profileMessage += `\n*Edit Profile:*\n`;
      profileMessage += `• /profile edit name "New Name"\n`;
      profileMessage += `• /profile edit description "New Description"\n`;
      profileMessage += `• /profile edit pin\n\n`;
      profileMessage += `*Commands:* Type /help for all commands`;

      return {
        success: true,
        message: profileMessage,
        profile: {
          businessName: shop.businessName,
          businessDescription: shop.businessDescription,
          registeredAt: shop.registeredAt,
          lastLogin: shop.lastLogin,
          isLoggedIn,
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

  /**
   * Start PIN change process (requires old PIN first for security)
   */
  async startPinChange(telegramId) {
    try {
      // Must be logged in to change PIN
      if (!this.isAuthenticated(telegramId)) {
        return {
          success: false,
          message: "*Please login first*\n\nUse /login to access your account.",
        };
      }

      const shop = await Shop.findOne({ telegramId });
      if (!shop) {
        return {
          success: false,
          message: "*Profile not found*",
        };
      }

      // Start PIN change session
      this.pinChangeSessions.set(telegramId, {
        step: "old_pin",
        startTime: Date.now(),
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

  /**
   * Process PIN change steps
   */
  async processPinChange(telegramId, input) {
    try {
      const session = this.pinChangeSessions.get(telegramId);

      if (!session) {
        return {
          success: false,
          message:
            "*No PIN change in progress*\n\nUse /profile edit pin to start",
        };
      }

      // Check for cancellation
      if (input.toLowerCase().trim() === "cancel") {
        this.pinChangeSessions.delete(telegramId);
        return {
          success: false,
          message: "*PIN change cancelled*",
        };
      }

      // Check timeout (10 minutes)
      if (Date.now() - session.startTime > this.pinChangeTimeout) {
        this.pinChangeSessions.delete(telegramId);
        return {
          success: false,
          message:
            "*PIN change timed out*\n\nPlease start over with /profile edit pin",
        };
      }

      const shop = await Shop.findOne({ telegramId });
      if (!shop) {
        this.pinChangeSessions.delete(telegramId);
        return {
          success: false,
          message: "*Profile not found*",
        };
      }

      // Step 1: Verify old PIN
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

        // Verify old PIN
        const isValid = await bcrypt.compare(oldPin, shop.pin);
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

        // Move to new PIN step
        session.step = "new_pin";
        this.pinChangeSessions.set(telegramId, session);

        return {
          success: true,
          step: "new_pin",
          message:
            "*Current PIN Verified*\n\n" +
            "*Step 2 of 2: Enter New PIN*\n\n" +
            "Please choose a new 4-digit PIN.\n\n" +
            "*Weak PIN examples to avoid:*\n" +
            "• 1234, 4321\n" +
            "• 0000, 1111\n" +
            "• 0123, 3210\n\n" +
            "Type `cancel` to abort",
        };
      }

      // Step 2: Set new PIN
      if (session.step === "new_pin") {
        const newPin = input.trim();

        // Validate new PIN
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

        // Check if same as old PIN
        const isSameAsOld = await bcrypt.compare(newPin, shop.pin);
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

        // Hash and save new PIN
        const hashedPin = await bcrypt.hash(newPin, 12);
        shop.pin = hashedPin;
        await shop.save();

        // Clear session
        this.pinChangeSessions.delete(telegramId);

        return {
          success: true,
          completed: true,
          message:
            "*PIN Changed Successfully!*\n\n" +
            "Your new PIN has been saved.\n\n" +
            "Use your new PIN for future logins.\n\n" +
            "*Security Tip:* Keep your PIN confidential!",
        };
      }

      return {
        success: false,
        message: "*Invalid step in PIN change process*",
      };
    } catch (error) {
      console.error("[AuthService] Process PIN change error:", error);
      this.pinChangeSessions.delete(telegramId);
      return {
        success: false,
        message: "Failed to process PIN change. Please try again.",
      };
    }
  }

  /**
   * Update business name
   */
  async updateBusinessName(telegramId, newName) {
    try {
      // Must be logged in
      if (!this.isAuthenticated(telegramId)) {
        return {
          success: false,
          message: "*Please login first*\n\nUse /login to access your account.",
        };
      }

      const trimmedName = newName.trim();

      // Validate name
      const validation = this.validateBusinessName(trimmedName);
      if (!validation.valid) {
        return {
          success: false,
          message: `*${validation.message}*`,
        };
      }

      // Check uniqueness (exclude current user)
      const existing = await Shop.findOne({
        telegramId: { $ne: telegramId },
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

      // Update name
      const shop = await Shop.findOne({ telegramId });
      if (!shop) {
        return {
          success: false,
          message: "*Profile not found*",
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
          `New Name: ${trimmedName}\n\n` +
          "Your business name has been changed successfully!",
      };
    } catch (error) {
      console.error("[AuthService] Update business name error:", error);
      return {
        success: false,
        message: "❌ Failed to update business name. Please try again.",
      };
    }
  }

  /**
   * Update business description
   */
  async updateBusinessDescription(telegramId, newDescription) {
    try {
      // Must be logged in
      if (!this.isAuthenticated(telegramId)) {
        return {
          success: false,
          message: "*Please login first*\n\nUse /login to access your account.",
        };
      }

      const trimmedDescription = newDescription.trim();

      // Validate description
      const validation = this.validateBusinessDescription(trimmedDescription);
      if (!validation.valid) {
        return {
          success: false,
          message: `*${validation.message}*`,
        };
      }

      // Update description
      const shop = await Shop.findOne({ telegramId });
      if (!shop) {
        return {
          success: false,
          message: "*Profile not found*",
        };
      }

      const oldDescription = shop.businessDescription || "Not set";
      shop.businessDescription = trimmedDescription;
      await shop.save();

      return {
        success: true,
        message:
          "*Business Description Updated!*\n\n" +
          `Old: ${oldDescription}\n` +
          `New: ${trimmedDescription}\n\n` +
          "Your business description has been updated!",
      };
    } catch (error) {
      console.error("[AuthService] Update description error:", error);
      return {
        success: false,
        message: "Failed to update description. Please try again.",
      };
    }
  }

  /**
   * Get PIN change status (check if in progress)
   */
  getPinChangeStatus(telegramId) {
    const session = this.pinChangeSessions.get(telegramId);

    if (!session) {
      return null;
    }

    return {
      step: session.step,
      stepNumber: session.step === "old_pin" ? 1 : 2,
      totalSteps: 2,
      stepName:
        session.step === "old_pin" ? "Verify Current PIN" : "Enter New PIN",
    };
  }

  // ==========================================
  // SESSION & AUTHENTICATION METHODS
  // ==========================================

  /**
   * Check if user is authenticated
   */
  isAuthenticated(telegramId) {
    const session = this.activeSessions.get(telegramId);
    if (!session) return false;

    // Check session timeout
    const now = Date.now();
    const lastActivity = new Date(session.lastActivity).getTime();

    if (now - lastActivity > this.sessionTimeout) {
      this.activeSessions.delete(telegramId);
      return false;
    }

    return true;
  }

  /**
   * Update session activity
   */
  updateActivity(telegramId) {
    const session = this.activeSessions.get(telegramId);
    if (session) {
      session.lastActivity = new Date();
      this.activeSessions.set(telegramId, session);
    }
  }

  /**
   * Get authenticated shop
   */
  async getAuthenticatedShop(telegramId) {
    if (!this.isAuthenticated(telegramId)) {
      return null;
    }
    return await Shop.findOne({ telegramId });
  }

  // ==========================================
  // VALIDATION METHODS
  // ==========================================

  /**
   * Validate business name
   */
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

  /**
   * Validate business description
   */
  validateBusinessDescription(description) {
    if (!description || description.trim().length === 0) {
      return { valid: false, message: "Description cannot be empty" };
    }

    const trimmed = description.trim();

    if (trimmed.length < 10) {
      return {
        valid: false,
        message: "Description must be at least 10 characters",
      };
    }

    if (trimmed.length > 500) {
      return {
        valid: false,
        message: "Description must be less than 500 characters",
      };
    }

    return { valid: true };
  }

  /**
   * Validate PIN
   */
  validatePin(pin) {
    if (!/^\d{4}$/.test(pin)) {
      return { valid: false, message: "PIN must be exactly 4 digits" };
    }

    // Check for weak patterns
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
  // RATE LIMITING METHODS
  // ==========================================

  /**
   * Check rate limit for login attempts
   */
  checkRateLimit(telegramId) {
    const attempts = this.loginAttempts.get(telegramId);

    if (!attempts) return { allowed: true };

    const now = Date.now();

    if (attempts.lockedUntil && now < attempts.lockedUntil) {
      const remainingMs = attempts.lockedUntil - now;
      const remainingMin = Math.ceil(remainingMs / 60000);

      return {
        allowed: false,
        success: false,
        message:
          "*Account Temporarily Locked*\n\n" +
          `Too many failed login attempts.\n\n` +
          `Try again in ${remainingMin} minute${
            remainingMin !== 1 ? "s" : ""
          }.\n\n` +
          "Contact support if you've forgotten your PIN.",
      };
    }

    return { allowed: true };
  }

  /**
   * Record failed login attempt
   */
  recordFailedAttempt(telegramId) {
    const attempts = this.loginAttempts.get(telegramId) || { count: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();

    if (attempts.count >= this.maxAttempts) {
      attempts.lockedUntil = Date.now() + this.lockoutDuration;
    }

    this.loginAttempts.set(telegramId, attempts);
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Generate session token
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Get time-based greeting
   */
  getTimeBasedGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    if (hour < 21) return "Good evening!";
    return "Good night!";
  }

  /**
   * Format last login time
   */
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
  // CLEANUP METHODS
  // ==========================================

  /**
   * Start cleanup intervals for expired sessions
   */
  startCleanupIntervals() {
    // Clean expired sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [telegramId, session] of this.activeSessions.entries()) {
        const lastActivity = new Date(session.lastActivity).getTime();
        if (now - lastActivity > this.sessionTimeout) {
          this.activeSessions.delete(telegramId);
          console.log(`[AuthService] Cleaned expired session: ${telegramId}`);
        }
      }
    }, 5 * 60 * 1000);

    // Clean expired registrations every 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [telegramId, session] of this.registrationSessions.entries()) {
        if (now - session.startTime > this.registrationTimeout) {
          this.registrationSessions.delete(telegramId);
          console.log(
            `[AuthService] Cleaned expired registration: ${telegramId}`
          );
        }
      }
    }, 10 * 60 * 1000);

    // Clean expired PIN change sessions every 15 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [telegramId, session] of this.pinChangeSessions.entries()) {
        if (now - session.startTime > this.pinChangeTimeout) {
          this.pinChangeSessions.delete(telegramId);
          console.log(
            `[AuthService] Cleaned expired PIN change: ${telegramId}`
          );
        }
      }
    }, 15 * 60 * 1000);

    // Clean old rate limits every hour
    setInterval(() => {
      const now = Date.now();
      for (const [telegramId, attempts] of this.loginAttempts.entries()) {
        if (attempts.lockedUntil && now > attempts.lockedUntil) {
          this.loginAttempts.delete(telegramId);
          console.log(
            `[AuthService] Cleaned expired rate limit: ${telegramId}`
          );
        }
      }
    }, 60 * 60 * 1000);

    console.log("[AuthService] Cleanup intervals started");
  }
}

export default new AuthService();

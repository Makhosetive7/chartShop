import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import Shop from "../models/Shop.js"

class AuthService {
  constructor() {
    //session management
    this.activeSessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    //registration tracking
    this.registrationSessions = new Map();
    this.registrationTimeout = 15 * 60 * 1000; // 15 minutes

    //Rate limiting for login attempts
    this.loginAttempts = new Map();
    this.maxAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes

    this.startCleanupIntervals();
  }

  // Step 1: Start registration
  async startRegistration(telegramId, userData = {}) {
    try {
      const existingShop = await Shop.findOne({ telegramId });
      if (existingShop) {
        return {
          success: false,
          message:
            "*You already have an account!*\n\n" +
            `Shop: ${existingShop.shopName || existingShop.businessName}\n\n` +
            "Use /login to access your account.",
        };
      }

      this.registrationSessions.set(telegramId, {
        step: "shop_name",
        data: { telegramId },
        startTime: Date.now(),
      });

      return {
        success: true,
        step: "shop_name",
        message:
          "*Welcome! Let's set up your shop*\n\n" +
          "*Step 1 of 3: Shop Name*\n\n" +
          "What is your shop name?\n\n" +
          'Examples: "Mike\'s Electronics", "City Pharmacy", "Corner Store"\n\n' +
          "_(Type your shop name below)_",
      };
    } catch (error) {
      console.log("Error starting registration", error);
      return {
        success: false,
        message: "Internal server error",
      };
    }
  }

  //Process registration steps
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
        case "shop_name":
          return await this.handleShopNameStep(telegramId, input, session);

        case "shop_description":
          return await this.handleShopDescriptionStep(
            telegramId,
            input,
            session
          );

        case "pin_setup":
          return await this.handlePinSetupStep(telegramId, input, session);

        default:
          return {
            success: false,
            message: "Invalid step. Please start over with /register",
          };
      }
    } catch (error) {
      console.error("Error processing registration step:", error);
      return {
        success: false,
        message: "Something went wrong. Please try again.",
      };
    }
  }

  // Step 1: Shop Name
  async handleShopNameStep(telegramId, shopName, session) {
    // Validate shop name
    const validation = this.validateShopName(shopName);
    if (!validation.valid) {
      return {
        success: false,
        message:
          `${validation.message}\n\n` + "_Please enter a valid shop name:_",
      };
    }

    // Check if name already exists
    const existing = await Shop.findOne({
      businessName: { $regex: new RegExp(`^${shopName.trim()}$`, "i") },
    });

    if (existing) {
      return {
        success: false,
        message:
          "*Shop name already taken*\n\n" +
          `"${shopName.trim()}" is already registered.\n\n` +
          "Try:\n" +
          `• "${shopName.trim()} Express"\n` +
          `• "${shopName.trim()} [Your Area]"\n` +
          `• "[Your Name]'s ${shopName.trim()}"\n\n` +
          "_Please enter a different name:_",
      };
    }

    // Save and proceed to next step
    session.data.shopName = shopName.trim();
    session.data.businessName = shopName.trim();
    session.step = "shop_description";

    return {
      success: true,
      step: "shop_description",
      message:
        `"${shopName.trim()}" is available!\n\n` +
        "*Step 2 of 3: Shop Description*\n\n" +
        "Briefly describe what you sell.\n\n" +
        "Examples:\n" +
        '• "Electronics and gadgets"\n' +
        '• "Pharmacy and health products"\n' +
        '• "General goods and groceries"\n' +
        '• "Clothing and accessories"\n\n' +
        "_(Type your description below)_",
    };
  }

  // Step 2: Shop Description
  async handleShopDescriptionStep(telegramId, description, session) {
    // Validate description
    const validation = this.validateShopDescription(description);
    if (!validation.valid) {
      return {
        success: false,
        message:
          `${validation.message}\n\n` + "_Please enter a valid description:_",
      };
    }

    // Save and proceed to PIN setup
    session.data.shopDescription = description.trim();
    session.data.businessDescription = description.trim();
    session.step = "pin_setup";

    return {
      success: true,
      step: "pin_setup",
      message:
        "Great description!\n\n" +
        "*Step 3 of 3: Create PIN*\n\n" +
        "Create a 4-digit PIN to secure your account.\n\n" +
        "*Important:*\n" +
        "• Use exactly 4 digits\n" +
        "• Avoid simple PINs like 1234 or 0000\n" +
        "• Remember this PIN - you'll need it to login\n\n" +
        "_(Enter your 4-digit PIN)_",
    };
  }

  // Step 3: PIN Setup and Complete Registration
  async handlePinSetupStep(telegramId, pin, session) {
    // Validate PIN
    const validation = this.validatePin(pin);
    if (!validation.valid) {
      return {
        success: false,
        message:
          `${validation.message}\n\n` +
          "_Please enter a different 4-digit PIN:_",
      };
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 12);

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
      message:
        "*Registration Complete!*\n\n" +
        `${session.data.shopName} is ready!\n\n` +
        "*Quick Start:*\n\n" +
        "*Get Help:*\n" +
        "• /help - See all commands\n\n" +
        "_Start by adding some products!_",
      shop: shop.toObject(),
    };
  }

  // Login with PIN
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
            "No shop registered with this Telegram account.\n\n" +
            "New user? Use /register to create your shop.",
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
          `Welcome back to *${shop.businessName || shop.shopName}*\n\n` +
          `Last login: ${
            shop.lastLogin ? this.formatLastLogin(shop.lastLogin) : "First time"
          }\n\n` +
          "*Quick Actions:*\n" +
          "• /help - See all commands",
        shop: shop.toObject(),
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "Login failed. Please try again.",
      };
    }
  }

  // logout
  async logout(telegramId) {
    try {
      this.activeSessions.delete(telegramId);

      const shop = await Shop.findOne({ telegramId });
      if (shop) {
        shop.lastLogout = new Date();
        await shop.save();
      }

      return {
        success: true,
        message:
          "*Logged out successfully*\n\n" +
          "Your session has ended.\n\n" +
          "Use /login to access your account again.",
      };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        message: "Logout failed.",
      };
    }
  }

  // Check if authenticated
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

  // Update session activity
  updateActivity(telegramId) {
    const session = this.activeSessions.get(telegramId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  // Get authenticated shop
  async getAuthenticatedShop(telegramId) {
    if (!this.isAuthenticated(telegramId)) {
      return null;
    }
    return await Shop.findOne({ telegramId });
  }

  // Validation helpers
  validateShopName(name) {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: "Shop name cannot be empty." };
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
      return {
        valid: false,
        message: "Shop name must be at least 2 characters.",
      };
    }

    if (trimmed.length > 50) {
      return {
        valid: false,
        message: "Shop name must be less than 50 characters.",
      };
    }

    return { valid: true };
  }

  validateShopDescription(description) {
    if (!description || description.trim().length === 0) {
      return { valid: false, message: "Description cannot be empty." };
    }

    const trimmed = description.trim();

    if (trimmed.length < 5) {
      return {
        valid: false,
        message: "Description must be at least 5 characters.",
      };
    }

    if (trimmed.length > 200) {
      return {
        valid: false,
        message: "Description must be less than 200 characters.",
      };
    }

    return { valid: true };
  }

  validatePin(pin) {
    if (!/^\d{4}$/.test(pin)) {
      return { valid: false, message: "PIN must be exactly 4 digits." };
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
        message: "PIN is too simple. Please choose a stronger PIN.",
      };
    }

    return { valid: true };
  }

  // Rate limiting
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
          "*Account temporarily locked*\n\n" +
          `Too many failed attempts.\n\n` +
          `Try again in ${remainingMin} minute${
            remainingMin !== 1 ? "s" : ""
          }.`,
      };
    }

    return { allowed: true };
  }

  recordFailedAttempt(telegramId) {
    const attempts = this.loginAttempts.get(telegramId) || { count: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();

    if (attempts.count >= this.maxAttempts) {
      attempts.lockedUntil = Date.now() + this.lockoutDuration;
    }

    this.loginAttempts.set(telegramId, attempts);
  }

  // Utility functions
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

  /**
   * Get registration status
   */
  getRegistrationStatus(telegramId) {
    const session = this.registrationSessions.get(telegramId);
    if (!session) return null;

    const stepNames = {
      shop_name: "Shop Name",
      shop_description: "Shop Description",
      pin_setup: "PIN Setup",
    };

    const stepNumbers = {
      shop_name: 1,
      shop_description: 2,
      pin_setup: 3,
    };

    return {
      currentStep: session.step,
      stepName: stepNames[session.step],
      stepNumber: stepNumbers[session.step],
      totalSteps: 3,
      data: {
        shopName: session.data.shopName || null,
        shopDescription: session.data.shopDescription || null,
      },
    };
  }

  // Cleanup intervals
  startCleanupIntervals() {
    // Clean expired sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [telegramId, session] of this.activeSessions.entries()) {
        const lastActivity = new Date(session.lastActivity).getTime();
        if (now - lastActivity > this.sessionTimeout) {
          this.activeSessions.delete(telegramId);
        }
      }
    }, 5 * 60 * 1000);

    // Clean expired registrations every 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [telegramId, session] of this.registrationSessions.entries()) {
        if (now - session.startTime > this.registrationTimeout) {
          this.registrationSessions.delete(telegramId);
        }
      }
    }, 10 * 60 * 1000);

    // Clean old rate limits every hour
    setInterval(() => {
      const now = Date.now();
      for (const [telegramId, attempts] of this.loginAttempts.entries()) {
        if (attempts.lockedUntil && now > attempts.lockedUntil) {
          this.loginAttempts.delete(telegramId);
        }
      }
    }, 60 * 60 * 1000);
  }
}

export default new AuthService();
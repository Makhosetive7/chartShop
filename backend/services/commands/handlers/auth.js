import bcrypt from "bcryptjs";
import Shop from "../../../models/Shop.js";
import AuthService from "../../AuthService.js";

export async function handleRegister(telegramId, text) {
  try {
    // Check if this is the old format: register "Business Name" 1234
    const oldFormatMatch =
      text.match(/register\s+"([^"]+)"\s+(\d{4})/i) ||
      text.match(/register\s+(\S+(?:\s+\S+)*?)\s+(\d{4})/i);

    if (oldFormatMatch) {
      // Old format - convert to new progressive registration
      const businessName = oldFormatMatch[1];
      const pin = oldFormatMatch[2];

      // Validate PIN
      const pinValidation = AuthService.validatePin(pin);
      if (!pinValidation.valid) {
        return `*Weak PIN*\n\n${pinValidation.message}\n\nPlease choose a stronger 4-digit PIN.`;
      }

      // Check if already registered
      const existing = await Shop.findOne({ telegramId });
      if (existing) {
        return "*Already Registered!*\n\nYou already have an account.\n\n• To login: `login 1234`\n\nYou can only have one shop per Telegram account.";
      }

      // Hash PIN and create shop
      const hashedPin = await bcrypt.hash(pin, 12);

      const shop = await Shop.create({
        telegramId,
        businessName: businessName,
        businessDescription: "General merchandise", // Default description
        pin: hashedPin,
        isActive: true,
        registeredAt: new Date(),
      });

      // Auto-login (persisted)
      await AuthService.createLoginSession(telegramId, shop._id);

      return `*Registration Complete!*\n\n ${businessName} is ready!\n\n *Quick Start:*\n\n*Add Products:*\n• add bread 2.50 stock 50\n• list - View products\n\n*Record Sales:*\n• sell 2 bread 1 milk\n• daily - View report\n\n*Get Help:*\n• help - See all commands\n\n💡 _Start by adding some products!_`;
    }

    if (text.trim().toLowerCase() === "register") {
      const result = await AuthService.startRegistration(telegramId, {
        firstName: "",
        lastName: "",
        username: "",
      });

      return result.message;
    }

    // If user is in registration flow, process the step
    const regStatus = await AuthService.getRegistrationStatus(telegramId);
    if (regStatus) {
      const result = await AuthService.processRegistrationStep(
        telegramId,
        text
      );
      return result.message;
    }

    // No match - show help
    return `*Registration Format*\n\n*Quick Registration:*\n\`register "Business Name" 1234\`\n\n*Or Progressive Registration:*\nJust type: \`register\`\n\n*Examples:*\n• \`register "Family Bakery" 5678\`\n• \`register\` (step-by-step)\n\n*Security Tip:* Use a unique 4-digit PIN.`;
  } catch (error) {
    console.error("Register error:", error);
    return "Registration failed. Please try again.";
  }
}

export async function handleLogin(telegramId, text) {
  try {
    // Check if already logged in
    if (await AuthService.isAuthenticated(telegramId)) {
      const shop = await Shop.findOne({ telegramId });
      return `*Already logged in*\n\n ${shop.businessName}\n\n*Quick Actions:*\n• sell - Record a sale\n• daily - View today's summary\n• products - Check inventory`;
    }

    // Old format: login 1234
    const oldFormatMatch = text.match(/^login\s+(\d{4})$/i);

    if (oldFormatMatch) {
      const pin = oldFormatMatch[1];
      const result = await AuthService.login(telegramId, pin);

      // Update shop isActive status for backward compatibility
      if (result.success) {
        const shop = await Shop.findOne({ telegramId });
        if (shop) {
          shop.isActive = true;
          await shop.save();
        }
      }

      return result.message;
    }

    if (text.trim().toLowerCase() === "login") {
      return `*Login*\n\nPlease enter your 4-digit PIN.`;
    }

    // Check if this is a PIN entry (4 digits)
    const pinMatch = text.match(/^\d{4}$/);
    if (pinMatch) {
      const pin = pinMatch[0];
      const result = await AuthService.login(telegramId, pin);

      // Update shop isActive status for backward compatibility
      if (result.success) {
        const shop = await Shop.findOne({ telegramId });
        if (shop) {
          shop.isActive = true;
          await shop.save();
        }
      }

      return result.message;
    }

    return "Invalid PIN format.\n\nUse: `login 1234`\nOr just type: `login`";
  } catch (error) {
    console.error("Login error:", error);
    return "Login failed. Please try again.";
  }
}

export async function handleLogout(telegramId) {
  try {
    // Use AuthService logout
    const result = await AuthService.logout(telegramId);

    const shop = await Shop.findOne({ telegramId });
    if (shop) {
      shop.isActive = false;
      await shop.save();
    }

    return result.message;
  } catch (error) {
    console.error("Logout error:", error);
    return "Failed to logout. Please try again.";
  }
}

export async function handleAccount(telegramId) {
  try {
    const shop = await Shop.findOne({ telegramId });

    if (!shop) {
      return "Account not found.";
    }

    const now = new Date();
    const isLocked = shop.lockedUntil && shop.lockedUntil > now;

    // Calculate time differences
    const formatTimeAgo = (date) => {
      if (!date) return "Never";
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    };

    const formatFullDate = (date) => {
      if (!date) return "N/A";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Build account message
    let message = "*YOUR ACCOUNT*\n\n";

    // Business Information
    message += "*Business Information*\n";
    message += `• Name: ${shop.businessName}\n`;
    message += `• Description: ${shop.businessDescription}\n`;
    message += `• Status: ${shop.isActive ? "Active" : "Inactive"}\n`;
    message += `• Security: ${isLocked ? "Locked" : "Unlocked"}\n`;
    message += `• Login Attempts: ${shop.loginAttempts}\n`;

    if (isLocked && shop.lockedUntil) {
      const lockTimeLeft = Math.ceil((shop.lockedUntil - now) / (1000 * 60));
      message += `Locked for: ${lockTimeLeft} minutes\n`;
    }
    message += "\n";

    // Timeline
    message += "*Timeline*\n";
    message += `• Registered: ${formatFullDate(shop.createdAt)}\n`;
    message += `• Last Login: ${
      shop.lastLogin ? formatTimeAgo(shop.lastLogin) : "Never"
    }\n`;

    if (shop.lastLogin) {
      message += `• Date: ${formatFullDate(shop.lastLogin)}\n`;
    }

    if (shop.lastLogout) {
      message += `• Last Logout: ${formatTimeAgo(shop.lastLogout)}\n`;
      message += `• Date: ${formatFullDate(shop.lastLogout)}\n`;
    }

    const accountAgeDays = Math.floor(
      (now - shop.createdAt) / (1000 * 60 * 60 * 24)
    );
    message += `• Account Age: ${accountAgeDays} days\n\n`;

    // Settings
    message += "*Settings*\n";
    message += `• Currency: ${shop.settings?.currency || "USD"}\n`;
    message += `• Timezone: ${shop.settings?.timezone || "Africa/Harare"}\n`;
    message += `• Low Stock Alert: ${
      shop.settings?.lowStockAlert || 10
    } units\n\n`;

    // Quick Stats
    if (shop.lastLogin) {
      const daysSinceLogin = Math.floor(
        (now - shop.lastLogin) / (1000 * 60 * 60 * 24)
      );
      message += "*Activity*\n";
      message += `• Last active: ${
        daysSinceLogin === 0 ? "Today" : `${daysSinceLogin} days ago`
      }\n`;

      if (shop.lastLogout) {
        const sessionDuration = shop.lastLogout - shop.lastLogin;
        const hours = Math.floor(sessionDuration / (1000 * 60 * 60));
        const minutes = Math.floor(
          (sessionDuration % (1000 * 60 * 60)) / (1000 * 60)
        );
        if (hours > 0 || minutes > 0) {
          message += `• Last session: ${hours}h ${minutes}m\n`;
        }
      }
      message += "\n";
    }

    // Commands
    message += "*Available Commands*\n";
    message += "• logout - End current session\n";
    message += "• help - Get help with commands\n";

    // Add warning if account is locked
    if (isLocked) {
      message += "\n*Warning:* Your account is temporarily locked. ";
      message += "Please wait or contact support.\n";
    }

    // Add tip about security
    if (shop.loginAttempts > 0) {
      message += "\n*Security Tip:* ";
      if (shop.loginAttempts >= 3) {
        message += "Multiple failed login attempts detected. ";
        message += "Ensure your PIN is secure!";
      } else {
        message += "Keep your PIN secure and don't share it!";
      }
    }

    return message;
  } catch (error) {
    console.error("Account error:", error);
    return "Failed to get account information.";
  }
}

export async function handleStatus(telegramId) {
  try {
    // Check registration status
    const regStatus = await AuthService.getRegistrationStatus(telegramId);
    if (regStatus) {
      return `*Registration in progress*\n\nStep ${regStatus.stepNumber}/${
        regStatus.totalSteps
      }: ${regStatus.stepName}\n\n${
        regStatus.data.businessName
          ? `Business Name: ${regStatus.data.businessName}\n`
          : ""
      }${
        regStatus.data.businessDescription
          ? `Description: ${regStatus.data.businessDescription}\n`
          : ""
      }\nContinue where you left off, or type a different command to start over.`;
    }

    // Check authentication status
    if (await AuthService.isAuthenticated(telegramId)) {
      const shop = await Shop.findOne({ telegramId });
      return `*Logged in*\n\n${shop.businessName}\n\nUse \`account\` for more details.`;
    }

    // Not registered or logged in
    return `*Status*\n\n Not logged in\n\n*New user?* Use \`register\`\n*Existing user?* Use \`login\``;
  } catch (error) {
    console.error("Status error:", error);
    return "Failed to check status.";
  }
}

export async function handleProfileEditName(telegramId, text) {
  try {
    // Match both with and without slash
    const match = text.match(
      /(?:\/)?profile\s+edit\s+name\s+(?:"([^"]+)"|(.+))$/i
    );

    if (!match) {
      return (
        "*Invalid Format*\n\n" +
        'Use: /profile edit name "New Name"\n\n' +
        "*Examples:*\n" +
        '• /profile edit name "Mike\'s Shop"\n' +
        '• /profile edit name "Premium Electronics"\n' +
        '• /profile edit name "Bella\'s Boutique"'
      );
    }

    const newName = (match[1] || match[2]).trim();

    if (!newName) {
      return (
        "*Business name cannot be empty*\n\n" +
        "Please provide a new business name."
      );
    }

    const result = await AuthService.updateBusinessName(telegramId, newName);
    return result.message;
  } catch (error) {
    console.error("[CommandService] Edit name error:", error);
    return "Failed to update business name. Please try again.";
  }
}

export async function handleProfileEditDescription(telegramId, text) {
  try {
    // Match both with and without slash
    const match = text.match(
      /(?:\/)?profile\s+edit\s+description\s+(?:"([^"]+)"|(.+))$/i
    );

    if (!match) {
      return (
        "*Invalid Format*\n\n" +
        'Use: /profile edit description "New Description"\n\n' +
        "*Examples:*\n" +
        '• /profile edit description "Electronics and gadgets"\n' +
        '• /profile edit description "Fashion and accessories"\n' +
        '• /profile edit description "Grocery and household items"'
      );
    }

    const newDescription = (match[1] || match[2]).trim();

    if (!newDescription) {
      return (
        "*Description cannot be empty*\n\n" +
        "Please provide a description for your business."
      );
    }

    const result = await AuthService.updateBusinessDescription(
      telegramId,
      newDescription
    );
    return result.message;
  } catch (error) {
    console.error("[CommandService] Edit description error:", error);
    return "Failed to update description. Please try again.";
  }
}

export async function handleProfileEditPin(telegramId) {
  try {
    const result = await AuthService.startPinChange(telegramId);
    return result.message;
  } catch (error) {
    console.error("[CommandService] Edit PIN error:", error);
    return "Failed to start PIN change. Please try again.";
  }
}


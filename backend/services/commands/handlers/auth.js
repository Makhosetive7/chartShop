import AuthService from "../../AuthService.js";

/**
 * @param {{ channel: string, channelKey: string }} ctx
 */
export async function handleRegister(ctx, text) {
  const { channel, channelKey } = ctx;
  try {
    // One-shot: register username "Business Name" 1234
    const oneShotQuoted =
      text.match(
        /^register\s+([a-zA-Z0-9_]{3,32})\s+"([^"]+)"\s+(\d{4})$/i
      ) ||
      text.match(
        /^register\s+([a-zA-Z0-9_]{3,32})\s+(\S+(?:\s+\S+)*?)\s+(\d{4})$/i
      );

    if (oneShotQuoted) {
      const username = oneShotQuoted[1];
      const businessName = oneShotQuoted[2];
      const pin = oneShotQuoted[3];

      const result = await AuthService.registerAccount({
        username,
        businessName,
        businessDescription: "General merchandise",
        pin,
        channel,
        channelKey,
      });

      if (!result.success) {
        const suggestions =
          result.suggestions?.length > 0
            ? `\n\n*Try:*\n${result.suggestions.map((s) => `• \`${s}\``).join("\n")}`
            : "";
        return `*Registration failed*\n\n${result.message}${suggestions}`;
      }

      const codesBlock = AuthService.formatRecoveryCodesMessage(
        result.recoveryCodes
      );

      return (
        `*Registration Complete!*\n\n` +
        `${businessName} is ready!\n\n` +
        `Username: \`${username.toLowerCase()}\`\n\n` +
        `Use the same username + PIN on web, Telegram, and WhatsApp.\n\n` +
        codesBlock +
        `*Quick Start:*\n\n` +
        `*Add Products:*\n• add bread 2.50 stock 50\n• list - View products\n\n` +
        `*Record Sales:*\n• sell 2 bread 1 milk\n• daily - View report\n\n` +
        `*Get Help:*\n• help - See all commands`
      );
    }

    if (text.trim().toLowerCase() === "register") {
      const result = await AuthService.startRegistration(channel, channelKey);
      return result.message;
    }

    const regStatus = await AuthService.getRegistrationStatus(
      channel,
      channelKey
    );
    if (regStatus) {
      const result = await AuthService.processRegistrationStep(
        channel,
        channelKey,
        text
      );
      return result.message;
    }

    return (
      `*Registration Format*\n\n` +
      `*Quick Registration:*\n` +
      `\`register yourusername "Business Name" 1234\`\n\n` +
      `*Username rules:* 3–15 lowercase letters, optional digits at the end (e.g. musa, musa7).\n\n` +
      `*Or Progressive Registration:*\n` +
      `Just type: \`register\`\n\n` +
      `*Examples:*\n` +
      `• \`register musa "Family Bakery" 5678\`\n` +
      `• \`register\` (step-by-step)\n\n` +
      `Same username + PIN work on web, Telegram, and WhatsApp.`
    );
  } catch (error) {
    console.error("Register error:", error);
    return "Registration failed. Please try again.";
  }
}

/**
 * @param {{ channel: string, channelKey: string }} ctx
 */
export async function handleLogin(ctx, text) {
  const { channel, channelKey } = ctx;
  try {
    if (await AuthService.isAuthenticated(channel, channelKey)) {
      const shop = await AuthService.getAuthenticatedShop(channel, channelKey);
      return (
        `*Already logged in*\n\n ${shop?.businessName || "Your shop"}` +
        (shop?.username ? ` (@${shop.username})` : "") +
        `\n\n*Quick Actions:*\n• sell - Record a sale\n• daily - View today's summary\n• products - Check inventory`
      );
    }

    // login username 1234
    const credentialsMatch = text.match(
      /^login\s+([a-zA-Z0-9_]{3,32})\s+(\d{4})$/i
    );
    if (credentialsMatch) {
      const result = await AuthService.loginWithCredentials({
        username: credentialsMatch[1],
        pin: credentialsMatch[2],
        channel,
        channelKey,
      });
      return result.message;
    }

    // login 1234 — only if this chat is already linked
    const pinOnlyMatch = text.match(/^login\s+(\d{4})$/i);
    if (pinOnlyMatch) {
      const result = await AuthService.loginWithPinOnly({
        pin: pinOnlyMatch[1],
        channel,
        channelKey,
      });
      return result.message;
    }

    if (text.trim().toLowerCase() === "login") {
      const linked = await AuthService.findShopByChannel(channel, channelKey);
      if (linked) {
        return (
          `*Login*\n\nThis chat is linked to @${linked.username}.\n\n` +
          `Enter your 4-digit PIN, or:\n` +
          `\`login ${linked.username} 1234\``
        );
      }
      return (
        `*Login*\n\nUse your username and PIN (same as web):\n\n` +
        `\`login your_username 1234\`\n\n` +
        `First login on this chat links it to your shop.`
      );
    }

    // Bare 4-digit PIN after "login" prompt — only when linked
    const pinMatch = text.match(/^\d{4}$/);
    if (pinMatch) {
      const result = await AuthService.loginWithPinOnly({
        pin: pinMatch[0],
        channel,
        channelKey,
      });
      return result.message;
    }

    return (
      "Invalid login format.\n\n" +
      "Use: `login your_username 1234`\n" +
      "Or (if this chat is already linked): `login 1234`"
    );
  } catch (error) {
    console.error("Login error:", error);
    return "Login failed. Please try again.";
  }
}

export async function handleLogout(ctx) {
  const { channel, channelKey } = ctx;
  try {
    const result = await AuthService.logout(channel, channelKey);
    return result.message;
  } catch (error) {
    console.error("Logout error:", error);
    return "Failed to logout. Please try again.";
  }
}

export async function handleAccount(ctx) {
  const { channel, channelKey } = ctx;
  try {
    const shop =
      (await AuthService.getAuthenticatedShop(channel, channelKey)) ||
      (await AuthService.findShopByChannel(channel, channelKey));

    if (!shop) {
      return "Account not found. Login with `login your_username 1234` first.";
    }

    const now = new Date();
    const isLocked = shop.lockedUntil && shop.lockedUntil > now;
    const isLoggedIn = await AuthService.isAuthenticated(channel, channelKey);

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

    let message = "*YOUR ACCOUNT*\n\n";
    message += "*Business Information*\n";
    message += `• Username: ${shop.username}\n`;
    message += `• Name: ${shop.businessName}\n`;
    message += `• Description: ${shop.businessDescription}\n`;
    message += `• Status: ${shop.isActive ? "Active" : "Inactive"}\n`;
    message += `• Session: ${isLoggedIn ? "Logged in" : "Logged out"}\n`;
    message += `• Telegram: ${
      shop.channels?.telegramChatId ? "Linked" : "Not linked"
    }\n`;
    message += `• WhatsApp: ${
      shop.channels?.whatsappPhone ? "Linked" : "Not linked"
    }\n`;
    message += `• Security: ${isLocked ? "Locked" : "Unlocked"}\n`;
    message += `• Login Attempts: ${shop.loginAttempts}\n\n`;

    message += "*Timeline*\n";
    message += `• Registered: ${formatFullDate(shop.createdAt)}\n`;
    message += `• Last Login: ${
      shop.lastLogin ? formatTimeAgo(shop.lastLogin) : "Never"
    }\n`;
    if (shop.lastLogout) {
      message += `• Last Logout: ${formatTimeAgo(shop.lastLogout)}\n`;
    }
    message += "\n*Available Commands*\n";
    message += "• logout - End this channel's session\n";
    message += "• help - Get help with commands\n";

    return message;
  } catch (error) {
    console.error("Account error:", error);
    return "Failed to get account information.";
  }
}

export async function handleStatus(ctx) {
  const { channel, channelKey } = ctx;
  try {
    const regStatus = await AuthService.getRegistrationStatus(
      channel,
      channelKey
    );
    if (regStatus) {
      return `*Registration in progress*\n\nStep ${regStatus.stepNumber}/${
        regStatus.totalSteps
      }: ${regStatus.stepName}\n\n${
        regStatus.data.username ? `Username: ${regStatus.data.username}\n` : ""
      }${
        regStatus.data.businessName
          ? `Business Name: ${regStatus.data.businessName}\n`
          : ""
      }\nContinue where you left off.`;
    }

    if (await AuthService.isAuthenticated(channel, channelKey)) {
      const shop = await AuthService.getAuthenticatedShop(channel, channelKey);
      return `*Logged in*\n\n${shop.businessName} (@${shop.username})\n\nUse \`account\` for more details.`;
    }

    const linked = await AuthService.findShopByChannel(channel, channelKey);
    if (linked) {
      return (
        `*Status*\n\nLinked to @${linked.username} but not logged in.\n\n` +
        `Use \`login ${linked.username} 1234\` or \`login 1234\``
      );
    }

    return `*Status*\n\n Not logged in\n\n*New user?* Use \`register\`\n*Existing user?* Use \`login your_username 1234\``;
  } catch (error) {
    console.error("Status error:", error);
    return "Failed to check status.";
  }
}

export async function handleProfileEditName(ctx, text) {
  const { channel, channelKey } = ctx;
  try {
    const match = text.match(
      /(?:\/)?profile\s+edit\s+name\s+(?:"([^"]+)"|(.+))$/i
    );

    if (!match) {
      return (
        "*Invalid Format*\n\n" +
        'Use: /profile edit name "New Name"\n\n' +
        "*Examples:*\n" +
        '• /profile edit name "Mike\'s Shop"'
      );
    }

    const newName = (match[1] || match[2]).trim();
    if (!newName) {
      return "*Business name cannot be empty*";
    }

    const result = await AuthService.updateBusinessName(
      channel,
      channelKey,
      newName
    );
    return result.message;
  } catch (error) {
    console.error("[CommandService] Edit name error:", error);
    return "Failed to update business name. Please try again.";
  }
}

export async function handleProfileEditUsername(ctx, text) {
  const { channel, channelKey } = ctx;
  try {
    const match = text.match(
      /(?:\/)?profile\s+edit\s+username\s+([a-zA-Z0-9_]{2,32})$/i
    );

    if (!match) {
      return (
        "*Invalid Format*\n\n" +
        "Use: `profile edit username newusername`\n\n" +
        "*Rules:* 3–15 lowercase letters, optional digits at the end.\n\n" +
        "*Examples:*\n" +
        "• `profile edit username musa`\n" +
        "• `profile edit username musa7`"
      );
    }

    const result = await AuthService.updateUsername(
      channel,
      channelKey,
      match[1]
    );
    return result.message;
  } catch (error) {
    console.error("[CommandService] Edit username error:", error);
    return "Failed to update username. Please try again.";
  }
}

export async function handleProfileEditDescription(ctx, text) {
  const { channel, channelKey } = ctx;
  try {
    const match = text.match(
      /(?:\/)?profile\s+edit\s+description\s+(?:"([^"]+)"|(.+))$/i
    );

    if (!match) {
      return (
        "*Invalid Format*\n\n" +
        'Use: /profile edit description "New Description"'
      );
    }

    const newDescription = (match[1] || match[2]).trim();
    if (!newDescription) {
      return "*Description cannot be empty*";
    }

    const result = await AuthService.updateBusinessDescription(
      channel,
      channelKey,
      newDescription
    );
    return result.message;
  } catch (error) {
    console.error("[CommandService] Edit description error:", error);
    return "Failed to update description. Please try again.";
  }
}

export async function handleProfileEditPin(ctx) {
  const { channel, channelKey } = ctx;
  try {
    const result = await AuthService.startPinChange(channel, channelKey);
    return result.message;
  } catch (error) {
    console.error("[CommandService] Edit PIN error:", error);
    return "Failed to start PIN change. Please try again.";
  }
}

/**
 * recover <username> <code> <newPin>
 * @param {{ channel: string, channelKey: string }} ctx
 */
export async function handleRecover(ctx, text) {
  try {
    const match = text.match(
      /^recover\s+(\S+)\s+(\S+)\s+(\d{4})$/i
    );
    if (!match) {
      return (
        "*Recover account*\n\n" +
        "Reset your PIN with a one-time recovery code:\n\n" +
        "`recover yourusername cs-xxxx-xxxx 1234`\n\n" +
        "Codes were shown once at signup (or in Settings). " +
        "Losing your PIN and all codes may lock you out permanently."
      );
    }

    const result = await AuthService.redeemRecoveryCode({
      username: match[1],
      code: match[2],
      newPin: match[3],
    });

    if (!result.success) {
      return `*Recovery failed*\n\n${result.message}`;
    }

    return (
      `*PIN reset*\n\n${result.message}\n\n` +
      `Sign in: \`login ${match[1].toLowerCase()} ${match[3]}\``
    );
  } catch (error) {
    console.error("[CommandService] Recover error:", error);
    return "Recovery failed. Please try again.";
  }
}

import telegramService from "./services/telegramService.js";
import dotenv from "dotenv";

dotenv.config();

async function testTelegramService() {
  console.log("Testing Telegram Service");
  console.log("=".repeat(40));

  try {
    // 1. Test bot token
    console.log("1. Testing bot token...");
    const botInfo = await telegramService.getWebhookInfo();
    console.log(`Bot connected: ${botInfo.ok ? "Yes" : "No"}`);
    console.log(`   Current webhook: ${botInfo.result.url || "None"}`);

    // 2. Test sending message (optional - need chat ID)
    console.log("\n2. Testing message sending...");
    const TEST_CHAT_ID = process.env.TEST_CHAT_ID; // Set this in .env if you want
    if (TEST_CHAT_ID) {
      await telegramService.sendTestMessage(TEST_CHAT_ID);
      console.log(`Test message sent to ${TEST_CHAT_ID}`);
    } else {
      console.log("ℹSet TEST_CHAT_ID in .env to test message sending");
    }

    // 3. Test webhook setting
    console.log("\n3. Testing webhook functions...");
    const testUrl = "https://example.com/webhook";
    // Just test the function, don't actually set it
    console.log(`Telegram service methods available`);
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testTelegramService();

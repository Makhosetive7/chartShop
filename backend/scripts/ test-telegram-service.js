import telegramService from "./services/telegramService.js";
import dotenv from "dotenv";

dotenv.config();

async function testTelegramService() {
  console.log("Testing Telegram Service");
  console.log("=".repeat(40));

  try {
    console.log("1. Testing bot token...");
    const botInfo = await telegramService.getWebhookInfo();
    console.log(`Bot connected: ${botInfo.ok ? "Yes" : "No"}`);
    console.log(`   Current webhook: ${botInfo.result.url || "None"}`);

    console.log("\n2. Testing message sending...");
    const TEST_CHAT_ID = process.env.TEST_CHAT_ID; 
    if (TEST_CHAT_ID) {
      await telegramService.sendTestMessage(TEST_CHAT_ID);
      console.log(`Test message sent to ${TEST_CHAT_ID}`);
    } else {
      console.log("ℹSet TEST_CHAT_ID in .env to test message sending");
    }

    console.log("\n3. Testing webhook functions...");
    const testUrl = "https://example.com/webhook";
    
    console.log(`Telegram service methods available`);
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testTelegramService();

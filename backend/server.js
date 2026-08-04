import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import connectDB from "./config/database.js";
import createApp from "./app.js";
import telegramService from "./services/telegramService.js";
import { handleTelegramUpdate } from "./adapters/telegram.js";

dotenv.config();

const environment = process.env.NODE_ENV || "development";
console.log(`Starting server in ${environment} mode`);

const createDirectories = () => {
  const directories = ["reports", "logs"];
  directories.forEach((dir) => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

connectDB();
createDirectories();

const app = createApp();

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
const USE_POLLING = process.env.USE_POLLING === "true";

let pollingOffset = 0;
let isPolling = false;

async function startPolling() {
  if (isPolling) return;

  isPolling = true;
  console.log("Starting polling mode...");

  try {
    await telegramService.deleteWebhook();
    console.log("Webhook deleted, polling mode active");
  } catch (error) {
    console.error("Could not delete webhook:", error.message);
  }

  while (isPolling) {
    try {
      const updates = await telegramService.getUpdates(pollingOffset);

      if (updates.ok && updates.result.length > 0) {
        for (const update of updates.result) {
          pollingOffset = update.update_id + 1;

          if (update.message && update.message.text) {
            try {
              await handleTelegramUpdate(update);
            } catch (error) {
              console.error("Error processing command:", error);
              const chatId = update.message.chat.id;
              await telegramService.sendMessage(
                chatId,
                "Sorry, an error occurred. Please try again."
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Polling error:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

function stopPolling() {
  isPolling = false;
  console.log("Polling stopped");
}

app.listen(PORT, HOST, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Host: ${HOST}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`API: http://${HOST}:${PORT}/api/v1`);

  if (USE_POLLING) {
    console.log(`Mode: POLLING (Development)`);
    console.log(`Webhook disabled for local development`);
    startPolling();
  } else {
    console.log(`Mode: WEBHOOK (Production)`);

    let webhookUrl = process.env.WEBHOOK_URL;

    if (!webhookUrl && process.env.RAILWAY_STATIC_URL) {
      webhookUrl = `https://${process.env.RAILWAY_STATIC_URL}/webhook/telegram`;
    }

    if (webhookUrl) {
      console.log(`Setting webhook to: ${webhookUrl}`);

      try {
        const result = await telegramService.setWebhook(webhookUrl);
        if (result.ok) {
          console.log("Webhook set successfully");
          console.log(`Webhook details:`, result);
        } else {
          console.error("Failed to set webhook:", result);
        }
      } catch (error) {
        console.error("Webhook setup error:", error.message);
        console.error("Full error:", error);
      }
    } else {
      console.error("No webhook URL configured!");
      console.error(
        "Set WEBHOOK_URL or RAILWAY_STATIC_URL environment variable"
      );
    }
  }
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  stopPolling();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  stopPolling();
  process.exit(0);
});

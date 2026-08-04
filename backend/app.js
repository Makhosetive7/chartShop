import express from "express";
import telegramRoutes from "./routes/telegram.js";
import whatsappRoutes from "./routes/whatsapp.js";
import apiV1Routes from "./routes/api/v1.js";
import { isWhatsAppConfigured } from "./adapters/whatsapp.js";

/**
 * Build the Express app (no listen / no Telegram polling).
 * Used by server.js and API tests.
 */
export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Light CORS for a future web frontend
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    return next();
  });

  app.use("/webhook", telegramRoutes);
  app.use("/webhook", whatsappRoutes);
  app.use("/api/v1", apiV1Routes);

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      service: "ChatShop",
      environment: process.env.NODE_ENV || "development",
      mode: process.env.USE_POLLING === "true" ? "polling" : "webhook",
      whatsapp: isWhatsAppConfigured() ? "enabled" : "disabled",
      api: "/api/v1",
      timestamp: new Date().toISOString(),
      node_version: process.version,
    });
  });

  app.get("/", (req, res) => {
    res.json({
      message: "ChatShop Business Bot API",
      status: "operational",
      environment: process.env.NODE_ENV || "development",
      mode: process.env.USE_POLLING === "true" ? "polling" : "webhook",
      endpoints: {
        api: "/api/v1",
        telegramWebhook: "/webhook/telegram",
        whatsappWebhook: "/webhook/whatsapp",
        health: "/health",
        docs: "/ — see scripts/WEB_API_V1.md",
      },
      version: "1.0.0",
    });
  });

  app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  app.use("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}

export default createApp;

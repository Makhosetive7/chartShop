import express from "express";
import telegramRoutes from "./routes/telegram.js";
import whatsappRoutes from "./routes/whatsapp.js";
import apiV1Routes from "./routes/api/v1.js";
import { isWhatsAppConfigured } from "./adapters/whatsapp.js";

// Import models to ensure they're registered
import "./models/IdempotencyRecord.js";

// Import rate limiting middleware
import { apiRateLimit } from "./middleware/rateLimiter.js";
import { captureRawBody } from "./middleware/rawBody.js";

/**
 * Build the Express app (no listen / no Telegram polling).
 * Used by server.js and API tests.
 */
export function createApp() {
  const app = express();

  // Capture raw body for webhook signature verification (before JSON parsing)
  app.use(captureRawBody());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply global API rate limiting  
  app.use(apiRateLimit);

  // Secure CORS configuration - fail closed in production
  app.use((req, res, next) => {
    const corsOrigin = process.env.CORS_ORIGIN;
    
    // In production, require explicit CORS_ORIGIN - no wildcard fallback
    if (process.env.NODE_ENV === 'production' && !corsOrigin) {
      console.error('SECURITY: CORS_ORIGIN not set in production - blocking all origins');
      res.setHeader("Access-Control-Allow-Origin", "null");
    } else {
      // Development fallback to localhost, production uses explicit origin
      const allowedOrigin = corsOrigin || "http://localhost:5173";
      
      // Validate origin format in production
      if (process.env.NODE_ENV === 'production' && corsOrigin) {
        const isValidOrigin = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(corsOrigin) ||
                             corsOrigin === 'http://localhost:5173'; // Allow localhost for staging
        
        if (!isValidOrigin) {
          console.error(`SECURITY: Invalid CORS_ORIGIN format: ${corsOrigin}`);
          res.setHeader("Access-Control-Allow-Origin", "null");
        } else {
          res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
          console.log(`CORS allowing validated origin: ${allowedOrigin}`);
        }
      } else {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      }
    }
    // Only set additional headers if origin is allowed
    const currentOrigin = res.getHeader("Access-Control-Allow-Origin");
    if (currentOrigin && currentOrigin !== "null") {
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, X-Requested-With"
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.setHeader("Access-Control-Max-Age", "86400"); // Cache preflight for 24h
      
      // Handle preflight requests
      if (req.method === "OPTIONS") {
        return res.status(204).end();
      }
    } else if (req.method === "OPTIONS") {
      // Reject preflight for blocked origins
      return res.status(403).json({ 
        error: "CORS policy violation",
        message: "Origin not allowed"
      });
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

  app.post("/jobs/credit-due-reminders", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return res.status(404).json({ error: "Route not found" });
    }
    const header =
      req.get("X-Cron-Secret") ||
      String(req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (header !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { runCreditDueReminders } = await import(
        "./services/CreditDueReminderService.js"
      );
      const result = await runCreditDueReminders();
      return res.json({ success: true, ...result });
    } catch (error) {
      console.error("[credit-due] http job failed:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to run credit due reminders.",
      });
    }
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

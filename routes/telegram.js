import express from "express";
import {
  handleWebhook,
  testWebhook,
} from "../controllers/telegramController.js";

const router = express.Router();

// Inbound Telegram updates only.
// Webhook registration is CLI-only: `npm run deploy` / scripts/setWebhook.js
router.post("/telegram", handleWebhook);
router.get("/telegram", testWebhook);

export default router;

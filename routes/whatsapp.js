import express from "express";
import {
  handleWebhook,
  verifyWebhook,
  testWebhook,
} from "../controllers/whatsappController.js";

const router = express.Router();

router.get("/whatsapp", verifyWebhook);
router.get("/whatsapp/status", testWebhook);
router.post("/whatsapp", handleWebhook);

export default router;

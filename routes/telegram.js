import express from 'express';
import { 
  handleWebhook, 
  setWebhook, 
  testWebhook 
} from '../controllers/telegramController.js';

const router = express.Router();

// POST: Telegram sends updates here
router.post('/telegram', handleWebhook);

// GET: For testing if endpoint is active
router.get('/telegram', testWebhook);

// POST: Manually set webhook (optional)
router.post('/telegram/set-webhook', setWebhook);

export default router;
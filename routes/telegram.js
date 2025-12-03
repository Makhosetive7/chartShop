import express from 'express';
import { 
  handleWebhook, 
  setWebhook, 
  testWebhook 
} from '../controllers/telegramController.js';

const router = express.Router();

router.post('/telegram', handleWebhook);
router.get('/telegram', testWebhook);
router.post('/telegram/set-webhook', setWebhook);

export default router;
import express from 'express';
import { handleWebhook, setWebhook } from '../controllers/telegramController.js';

const router = express.Router();

router.post('/telegram', handleWebhook);
router.post('/telegram/set-webhook', setWebhook);

export default router;
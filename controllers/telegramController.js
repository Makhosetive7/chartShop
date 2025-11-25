import * as telegramService from '../services/telegramService.js';
import commandService from '../services/commandService.js';

export const handleWebhook = async (req, res) => {
  try {
    const update = req.body;

    if (!update.message || !update.message.text) {
      return res.sendStatus(200);
    }

    const chatId = update.message.chat.id;
    const telegramId = chatId.toString();
    const text = update.message.text;

    console.log(`📩 Message from ${telegramId}: ${text}`);

    const response = await commandService.processCommand(telegramId, text);

    await telegramService.sendMessage(chatId, response);

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

export const setWebhook = async (req, res) => {
  try {
    const webhookUrl = req.body.url;
    
    if (!webhookUrl) {
      return res.status(400).json({ 
        error: 'URL required',
        example: { url: 'https://your-domain.com/webhook/telegram' }
      });
    }

    const result = await telegramService.setWebhook(webhookUrl);
    
    res.json({ 
      success: true, 
      message: 'Webhook set successfully',
      data: result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

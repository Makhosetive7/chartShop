import telegramService from '../services/telegramService.js';
import commandService from '../services/commandService.js'; 

export const handleWebhook = async (req, res) => {
  try {
    const update = req.body;
    console.log('Webhook received:', update.update_id);

    if (!update.message || !update.message.text) {
      console.log('No text message, ignoring');
      return res.sendStatus(200);
    }

    const chatId = update.message.chat.id;
    const telegramId = chatId.toString();
    const text = update.message.text;

    console.log(`Message from ${telegramId}: ${text}`);

    // Process the command
    const response = await commandService.processCommand(telegramId, text);

    // Handle different response types
    if (response && typeof response === 'object') {
      if (response.type === 'pdf') {
        // Send PDF document
        console.log('Sending PDF:', response.fileName);
        await telegramService.sendDocument(chatId, response.filePath, response.message);
      } else if (response.type === 'pdf_generating') {
        // Send initial generating message
        await telegramService.sendMessage(chatId, response.message);
      }
    } else {
      // Send regular text response
      await telegramService.sendMessage(chatId, response);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    console.error('Error details:', error.stack);
    res.sendStatus(500);
  }
};

export const setWebhook = async (req, res) => {
  try {
    const webhookUrl = req.body.url;

    if (!webhookUrl) {
      return res.status(400).json({ 
        error: 'URL required',
        example: { url: 'https://chartshop-production.up.railway.app/webhook/telegram' }
      });
    }

    const result = await telegramService.setWebhook(webhookUrl);

    res.json({ 
      success: true, 
      message: 'Webhook set successfully',
      url: webhookUrl,
      data: result 
    });
  } catch (error) {
    console.error('Set webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Add a GET endpoint for testing
export const testWebhook = (req, res) => {
  res.json({
    status: 'active',
    message: 'Telegram webhook endpoint',
    method: 'POST',
    description: 'Send Telegram updates to this endpoint',
    instructions: 'Use POST with Telegram update JSON',
    environment: process.env.NODE_ENV || 'development',
    mode: process.env.USE_POLLING === 'true' ? 'polling' : 'webhook'
  });
};
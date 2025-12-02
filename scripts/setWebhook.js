import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function setTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const railwayUrl = process.env.RAILWAY_STATIC_URL;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
    process.exit(1);
  }
  
  if (!railwayUrl) {
    console.error('RAILWAY_STATIC_URL not found. Are you on Railway?');
    console.log('For local testing, use ngrok: ngrok http 3000');
    process.exit(1);
  }
  
  const webhookUrl = `${railwayUrl}/webhook/telegram`;
  
  console.log('Setting Telegram webhook...');
  console.log(`Bot Token: ${token.substring(0, 10)}...`);
  console.log(`Webhook URL: ${webhookUrl}`);
  
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        url: webhookUrl,
        max_connections: 40,
        allowed_updates: ['message', 'callback_query', 'chat_member']
      }
    );
    
    if (response.data.ok) {
      console.log('Webhook set successfully!');
      console.log('Webhook info:', response.data.result);
    } else {
      console.error('Failed to set webhook:', response.data.description);
    }
  } catch (error) {
    console.error('Error setting webhook:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Also add a function to get webhook info
async function getWebhookInfo() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );
    
    console.log('Current webhook info:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error getting webhook info:', error.message);
  }
}

// Run based on command line argument
const command = process.argv[2];
if (command === 'info') {
  getWebhookInfo();
} else {
  setTelegramWebhook();
}
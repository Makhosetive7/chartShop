import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

function resolveWebhookUrl() {
  if (process.env.WEBHOOK_URL) {
    return process.env.WEBHOOK_URL;
  }

  const railwayUrl = process.env.RAILWAY_STATIC_URL;
  if (railwayUrl) {
    const host = railwayUrl.replace(/^https?:\/\//, '');
    return `https://${host}/webhook/telegram`;
  }

  return null;
}

function resolveSecretToken() {
  if (process.env.TELEGRAM_WEBHOOK_SECRET) {
    return process.env.TELEGRAM_WEBHOOK_SECRET;
  }

  // Generate once and print so ops can save it — do not auto-persist.
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn(
    'TELEGRAM_WEBHOOK_SECRET not set. Generated ephemeral secret for this run only:'
  );
  console.warn(generated);
  console.warn(
    'Set TELEGRAM_WEBHOOK_SECRET in your environment and re-run to keep verification stable.'
  );
  return generated;
}

async function setTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = resolveWebhookUrl();

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
    process.exit(1);
  }

  if (!webhookUrl) {
    console.error('No webhook URL. Set WEBHOOK_URL or RAILWAY_STATIC_URL.');
    console.log('For local testing, use ngrok: ngrok http 3000');
    process.exit(1);
  }

  const secretToken = resolveSecretToken();

  console.log('Setting Telegram webhook...');
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log('Secret token: configured');

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        url: webhookUrl,
        secret_token: secretToken,
        max_connections: 40,
        allowed_updates: ['message', 'callback_query']
      }
    );

    if (response.data.ok) {
      console.log('Webhook set successfully!');
      console.log('Webhook info:', response.data.result);
    } else {
      console.error('Failed to set webhook:', response.data.description);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error setting webhook:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

async function getWebhookInfo() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found');
    process.exit(1);
  }

  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );

    console.log('Current webhook info:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error getting webhook info:', error.message);
    process.exit(1);
  }
}

async function deleteWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found');
    process.exit(1);
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${token}/deleteWebhook`
    );
    console.log('Webhook deleted:', response.data);
  } catch (error) {
    console.error('Error deleting webhook:', error.message);
    process.exit(1);
  }
}

const command = process.argv[2];
if (command === 'info') {
  getWebhookInfo();
} else if (command === 'delete') {
  deleteWebhook();
} else {
  setTelegramWebhook();
}

import axios from "axios";

export class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId, text) {
    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error sending Telegram message:', error.message);
      throw error;
    }
  }

  async setWebhook(url) {
    try {
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url: url,
      });
      console.log('Webhook set:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error setting webhook:', error.message);
      throw error;
    }
  }
}

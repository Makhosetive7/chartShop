import axios from "axios";

class TelegramService {
  constructor() {
    this.botToken ='8551800388:AAGVEumSprkGIxUykPyabI1ZpdK3XZxxxKo'

    // Validate token
    if (!this.botToken) {
      console.error("TELEGRAM_BOT_TOKEN is missing in .env!");
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }

    console.log("Bot token loaded:", this.botToken.substring(0, 10) + "...");

    // Base Telegram API URL
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Send Telegram Message
   */
  async sendMessage(chatId, text) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      });

      return response.data;
    } catch (error) {
      console.error("Error sending Telegram message:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Set Telegram Webhook
   */
  async setWebhook(url) {
    try {
      console.log("Setting webhook to:", url);
      console.log("Requesting:", `${this.apiUrl}/setWebhook`);

      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url,
      });

      console.log("Webhook response:", response.data);
      return response.data;

    } catch (error) {
      console.error("❌ Error setting webhook:", error.response?.data || error.message);
      throw error;
    }
  }
}

export default new TelegramService();

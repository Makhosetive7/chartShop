import axios from "axios";
import config from "../config/environment.js";

class TelegramService {
  constructor() {
    this.botToken = config.botToken;
    if (!this.botToken) throw new Error("TELEGRAM_BOT_TOKEN is required");
    console.log("🤖 Bot token loaded:", this.botToken.substring(0, 10) + "...");
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId, text, options = {}) {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || "Markdown",
        ...options
      });
      if (config.features.enableDebug) console.log('✅ Message sent to', chatId);
      return response.data;
    } catch (error) {
      console.error("❌ Send message error:", error.response?.data || error.message);
      throw error;
    }
  }

  async setWebhook(url) {
    try {
      console.log(`🔗 Setting webhook: ${url}`);
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url,
        drop_pending_updates: true,
      });
      if (response.data.ok) console.log("✅ Webhook set\n");
      return response.data;
    } catch (error) {
      console.error("❌ Webhook error:", error.response?.data || error.message);
      throw error;
    }
  }

  async getWebhookInfo() {
    try {
      const response = await axios.get(`${this.apiUrl}/getWebhookInfo`);
      return response.data.result;
    } catch (error) {
      console.error("❌ Webhook info error:", error.message);
      throw error;
    }
  }
}

export default new TelegramService();
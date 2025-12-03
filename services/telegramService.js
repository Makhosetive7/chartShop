import axios from "axios";

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.usePolling = process.env.USE_POLLING === 'true';
    this.environment = process.env.NODE_ENV || 'development';

    // Validate token
    if (!this.botToken) {
      console.error("TELEGRAM_BOT_TOKEN is missing in environment variables!");
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }

    console.log(`Bot token loaded: ${this.botToken.substring(0, 10)}...`);
    console.log(`Environment: ${this.environment}`);
    console.log(`Mode: ${this.usePolling ? 'Polling (Development)' : 'Webhook (Production)'}`);

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
   * Send Document (for PDF reports)
   */
  async sendDocument(chatId, filePath, caption = '') {
    try {
      const FormData = (await import('form-data')).default;
      const fs = (await import('fs')).default;
      
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('document', fs.createReadStream(filePath));
      
      if (caption) {
        form.append('caption', caption);
        form.append('parse_mode', 'Markdown');
      }

      const response = await axios.post(`${this.apiUrl}/sendDocument`, form, {
        headers: form.getHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error("Error sending document:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Set Telegram Webhook (Production only)
   */
  async setWebhook(url) {
    try {
      if (this.usePolling) {
        console.log("Polling mode enabled, skipping webhook setup");
        return { ok: true, description: "Polling mode - webhook not needed" };
      }

      console.log("Setting webhook to:", url);
      console.log("API URL:", `${this.apiUrl}/setWebhook`);

      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url,
        max_connections: 40,
        allowed_updates: ['message', 'callback_query']
      });

      console.log("Webhook response:", response.data);
      return response.data;

    } catch (error) {
      console.error("Error setting webhook:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete webhook (useful when switching to polling)
   */
  async deleteWebhook() {
    try {
      const response = await axios.post(`${this.apiUrl}/deleteWebhook`);
      console.log("Webhook deleted:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error deleting webhook:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo() {
    try {
      const response = await axios.get(`${this.apiUrl}/getWebhookInfo`);
      return response.data;
    } catch (error) {
      console.error("Error getting webhook info:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get bot info
   */
  async getBotInfo() {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return response.data;
    } catch (error) {
      console.error("Error getting bot info:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get updates (for polling mode)
   */
  async getUpdates(offset = 0, timeout = 30) {
    try {
      const response = await axios.get(`${this.apiUrl}/getUpdates`, {
        params: {
          offset,
          timeout,
          allowed_updates: ['message', 'callback_query']
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error getting updates:", error.response?.data || error.message);
      throw error;
    }
  }
}

export default new TelegramService();
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env.NODE_ENV || 'development';

console.log(`🔧 Loading ${env} environment...`);

if (env === 'development') {
  dotenv.config({ path: path.join(__dirname, '../.env.local') });
} else if (env === 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env.production') });
}

export const config = {
  env,
  port: parseInt(process.env.PORT || '3000', 10),
  host: env === 'production' ? '0.0.0.0' : 'localhost',
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  mongoUri: process.env.MONGODB_URI,
  railwayUrl: process.env.RAILWAY_STATIC_URL,
  webhookUrl: process.env.WEBHOOK_URL,
  usePolling: process.env.USE_POLLING === 'true',
  features: {
    enableLogging: env !== 'production',
    enableDebug: env === 'development',
    enableVerboseErrors: env === 'development',
  },
  getWebhookUrl() {
    if (this.env === 'production') {
      return this.railwayUrl ? `https://${this.railwayUrl}/webhook/telegram` : this.webhookUrl;
    }
    return `http://localhost:${this.port}/webhook/telegram`;
  },
  isValid() {
    const errors = [];
    if (!this.botToken) errors.push('TELEGRAM_BOT_TOKEN is required');
    if (!this.mongoUri) errors.push('MONGODB_URI is required');
    if (this.env === 'production' && !this.railwayUrl && !this.webhookUrl) {
      errors.push('RAILWAY_STATIC_URL or WEBHOOK_URL required');
    }
    if (errors.length > 0) {
      console.error('❌ Configuration errors:');
      errors.forEach(err => console.error(`   - ${err}`));
      return false;
    }
    return true;
  },
  display() {
    console.log('\n📋 Configuration:');
    console.log(`   Environment: ${this.env}`);
    console.log(`   Port: ${this.port}`);
    console.log(`   Bot: ***${this.botToken ? this.botToken.slice(-10) : 'NOT SET'}`);
    console.log(`   DB: ${this.mongoUri ? this.mongoUri.split('@')[1]?.split('/')[0] : 'NOT SET'}`);
    console.log(`   Polling: ${this.usePolling ? 'Yes' : 'No'}\n`);
  }
};

if (!config.isValid()) {
  console.error('\n💡 Create .env.local with required variables!\n');
  process.exit(1);
}

config.display();

export default config;
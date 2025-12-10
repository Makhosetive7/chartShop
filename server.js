import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/database.js';
import telegramRoutes from './routes/telegram.js';
import telegramService from './services/telegramService.js';
import commandService from './services/commandService.js';
import fs from 'fs';
import path from 'path';


dotenv.config();

const environment = process.env.NODE_ENV || 'development';
console.log(`Starting server in ${environment} mode`);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create necessary directories
const createDirectories = () => {
  const directories = ['reports', 'logs'];
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Connect to database
connectDB();

// Create directories
createDirectories();

// Routes
app.use('/webhook', telegramRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ChatShop',
    environment: process.env.NODE_ENV || 'development',
    mode: process.env.USE_POLLING === 'true' ? 'polling' : 'webhook',
    timestamp: new Date().toISOString(),
    node_version: process.version,
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'ChatShop Business Bot API',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    mode: process.env.USE_POLLING === 'true' ? 'polling' : 'webhook',
    endpoints: {
      webhook: '/webhook/telegram',
      health: '/health',
      docs: 'Coming soon...'
    },
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const USE_POLLING = process.env.USE_POLLING === 'true';

// Polling mechanism for local development
let pollingOffset = 0;
let isPolling = false;

async function startPolling() {
  if (isPolling) return;
  
  isPolling = true;
  console.log('📡 Starting polling mode...');
  
  // Delete webhook first
  try {
    await telegramService.deleteWebhook();
    console.log('Webhook deleted, polling mode active');
  } catch (error) {
    console.error('Could not delete webhook:', error.message);
  }

  while (isPolling) {
    try {
      const updates = await telegramService.getUpdates(pollingOffset);
      
      if (updates.ok && updates.result.length > 0) {
        for (const update of updates.result) {
          pollingOffset = update.update_id + 1;
          
          // Process update
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const telegramId = chatId.toString();
            const text = update.message.text;
            
            console.log(`Message from ${telegramId}: ${text}`);
            
            try {
              const response = await commandService.processCommand(telegramId, text);
              
              // Handle PDF responses
              if (response && typeof response === 'object' && response.type === 'pdf') {
                await telegramService.sendDocument(chatId, response.filePath, response.message);
              } else {
                await telegramService.sendMessage(chatId, response);
              }
            } catch (error) {
              console.error('Error processing command:', error);
              await telegramService.sendMessage(chatId, 'Sorry, an error occurred. Please try again.');
            }
          }
        }
      }
    } catch (error) {
      console.error('Polling error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

function stopPolling() {
  isPolling = false;
  console.log('Polling stopped');
}

// Start server
app.listen(PORT, HOST, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Host: ${HOST}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  
  if (USE_POLLING) {
    console.log(`Mode: POLLING (Development)`);
    console.log(`Webhook disabled for local development`);
    startPolling();
  } else {
    console.log(`Mode: WEBHOOK (Production)`);
    
    // Construct webhook URL
    let webhookUrl = process.env.WEBHOOK_URL;
    
    if (!webhookUrl && process.env.RAILWAY_STATIC_URL) {
      webhookUrl = `https://${process.env.RAILWAY_STATIC_URL}/webhook/telegram`;
    }
    
    if (webhookUrl) {
      console.log(`Setting webhook to: ${webhookUrl}`);
      
      // Set webhook in production
      try {
        const result = await telegramService.setWebhook(webhookUrl);
        if (result.ok) {
          console.log('Webhook set successfully');
          console.log(`Webhook details:`, result);
        } else {
          console.error('Failed to set webhook:', result);
        }
      } catch (error) {
        console.error('Webhook setup error:', error.message);
        console.error('Full error:', error);
      }
    } else {
      console.error('No webhook URL configured!');
      console.error('Set WEBHOOK_URL or RAILWAY_STATIC_URL environment variable');
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  stopPolling();
  process.exit(0);
});
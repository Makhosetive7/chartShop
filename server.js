import express from 'express';
import config from './config/environment.js';
import connectDB from './config/database.js';
import telegramRoutes from './routes/telegram.js';
import fs from 'fs';
import path from 'path';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.features.enableLogging) {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// Create necessary directories
const createDirectories = () => {
  const directories = ['reports', 'logs'];
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

// Connect to database
await connectDB();

// Create directories
createDirectories();

// Routes
app.use('/webhook', telegramRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ChatShop',
    timestamp: new Date().toISOString(),
    node_version: process.version,
    environment: config.env,
    database: 'connected'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'ChatShop Business Bot API',
    status: 'operational',
    environment: config.env,
    endpoints: {
      webhook: '/webhook/telegram',
      health: '/health',
    },
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.features.enableVerboseErrors ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(config.port, config.host, () => {
  console.log(`\n✨ ChatShop Bot Server Started!`);
  console.log(`   Environment: ${config.env}`);
  console.log(`   Server: http://${config.host}:${config.port}`);
  console.log(`   Health: http://${config.host}:${config.port}/health`);
  
  if (config.env === 'production') {
    console.log(`   Webhook: ${config.getWebhookUrl()}`);
  } else {
    console.log(`   Local Webhook: http://localhost:${config.port}/webhook/telegram`);
    console.log(`\n💡 In development mode - make sure to use polling or ngrok!`);
  }
  
  console.log('');
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n⏸️  Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
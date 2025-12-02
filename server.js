import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/database.js';
import telegramRoutes from './routes/telegram.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

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
      console.log(`✅ Created directory: ${dir}`);
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
    timestamp: new Date().toISOString(),
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'ChatShop Business Bot API',
    status: 'operational',
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

app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  
  if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_STATIC_URL) {
    console.log(`Telegram Webhook: ${process.env.RAILWAY_STATIC_URL}/webhook/telegram`);
  } else {
    console.log(`Local Webhook: http://localhost:${PORT}/webhook/telegram`);
  }
});
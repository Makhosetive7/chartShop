import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/database.js';
import telegramRoutes from './routes/telegram.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use('/webhook', telegramRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ChatShop' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Telegram webhook: http://localhost:${PORT}/webhook/telegram`);
});
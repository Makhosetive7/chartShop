import mongoose from 'mongoose';
import config from './environment.js';

const connectDB = async () => {
  try {
    console.log(`📊 Connecting to ${config.env} database...`);
    const conn = await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.db.databaseName}\n`);
    if (config.features.enableDebug) mongoose.set('debug', true);
    mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err));
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      if (config.env === 'production') setTimeout(connectDB, 5000);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (config.env === 'production') {
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;
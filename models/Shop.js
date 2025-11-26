import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
  },
  businessName: {
    type: String,
    required: true,
  },
  pin: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Shop', shopSchema);
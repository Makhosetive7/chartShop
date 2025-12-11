import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  businessDescription: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 500,
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
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },

  lastLogout: {
    type: Date,
  },

  // Rate limiting fields
  loginAttempts: {
    type: Number,
    default: 0,
  },

  lockedUntil: {
    type: Date,
  },

  // Settings
  settings: {
    currency: {
      type: String,
      default: "USD",
    },
    timezone: {
      type: String,
      default: "Africa/Harare",
    },
    lowStockAlert: {
      type: Number,
      default: 10,
    },
  },
});

// Indexes for performance
shopSchema.index({ shopName: 1 });
shopSchema.index({ telegramId: 1, isActive: 1 });

// Methods
shopSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

shopSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  return this.save();
};

export default mongoose.model("Shop", shopSchema);

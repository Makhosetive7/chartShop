import mongoose from "mongoose";

const channelsSchema = new mongoose.Schema(
  {
    telegramChatId: {
      type: String,
      default: null,
    },
    whatsappPhone: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const shopSchema = new mongoose.Schema({
  /** Canonical login identity — case-insensitive, unique. */
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 32,
    match: /^[a-z0-9_]+$/,
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
  /** Linked messaging transports (not login identity). */
  channels: {
    type: channelsSchema,
    default: () => ({}),
  },
  /** Admin/disable flag — not "currently logged in". */
  isActive: {
    type: Boolean,
    default: true,
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
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
  },
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

shopSchema.index({ businessName: 1 });
shopSchema.index(
  { "channels.telegramChatId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "channels.telegramChatId": { $type: "string" },
    },
  }
);
shopSchema.index(
  { "channels.whatsappPhone": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "channels.whatsappPhone": { $type: "string" },
    },
  }
);

shopSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

shopSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  return this.save();
};

export default mongoose.model("Shop", shopSchema);

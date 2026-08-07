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

/**
 * A person who can access a Shop. Login identity lives here (not on Shop).
 * role admin = can manage team / shop settings / recovery; members share day-to-day access.
 */
const userSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true,
  },
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
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50,
  },
  pin: {
    type: String,
    required: true,
  },
  /**
   * Invite flow: member must set their own PIN before normal login works.
   * Cleared after successful setup-pin.
   */
  mustSetPin: {
    type: Boolean,
    default: false,
  },
  /** Hash of one-time setup code (invite). Cleared after use. */
  setupCodeHash: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: ["admin", "member"],
    default: "member",
    required: true,
  },
  channels: {
    type: channelsSchema,
    default: () => ({}),
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  /** Set when permanently removed from the shop (soft deactivate). */
  removedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
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
});

userSchema.index(
  { "channels.telegramChatId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "channels.telegramChatId": { $type: "string" },
    },
  }
);
userSchema.index(
  { "channels.whatsappPhone": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "channels.whatsappPhone": { $type: "string" },
    },
  }
);
userSchema.index({ shopId: 1, isActive: 1 });

userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

userSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  return this.save();
};

export default mongoose.model("User", userSchema);

import mongoose from "mongoose";

/**
 * Persisted auth state: login sessions, registration flow, PIN change flow.
 * Mongo TTL index on expireAt auto-deletes expired docs.
 */
const authSessionSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["session", "registration", "pin_change"],
      required: true,
    },
    // Login session
    sessionToken: String,
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },
    loginTime: Date,
    lastActivity: Date,
    // Registration / PIN-change flow
    step: String,
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    startTime: Date,
    // TTL field — Mongo deletes when expireAt < now
    expireAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

authSessionSchema.index({ telegramId: 1, type: 1 }, { unique: true });
authSessionSchema.index({ sessionToken: 1 }, { sparse: true });
authSessionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AuthSession", authSessionSchema);

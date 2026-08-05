import mongoose from "mongoose";

/**
 * Persisted auth state: login sessions, registration flow, PIN change flow.
 * Login sessions are per channel (web / telegram / whatsapp), not per shop alone.
 * Mongo TTL index on expireAt auto-deletes expired docs.
 */
const authSessionSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["telegram", "whatsapp", "web"],
      required: true,
      index: true,
    },
    /** Transport key: telegram chat id, wa phone, or web session key. */
    channelKey: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["session", "registration", "pin_change"],
      required: true,
    },
    sessionToken: String,
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },
    loginTime: Date,
    lastActivity: Date,
    step: String,
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    startTime: Date,
    expireAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

authSessionSchema.index(
  { channel: 1, channelKey: 1, type: 1 },
  { unique: true }
);
authSessionSchema.index({ sessionToken: 1 }, { sparse: true });
authSessionSchema.index({ shopId: 1, type: 1 });
authSessionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AuthSession", authSessionSchema);

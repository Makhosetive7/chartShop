import mongoose from "mongoose";

/**
 * Hashed recovery codes for PIN reset.
 * Plaintext is never stored — only shown once at issue time.
 */
const recoveryCodeSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    /** HMAC-SHA256 hex of normalized code. */
    codeHash: {
      type: String,
      required: true,
      index: true,
    },
    /** Groups codes issued together (for revoke-on-regenerate). */
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: false }
);

recoveryCodeSchema.index({ shopId: 1, usedAt: 1, revokedAt: 1 });

export default mongoose.model("RecoveryCode", recoveryCodeSchema);

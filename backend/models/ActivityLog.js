import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ["telegram", "whatsapp", "web", "system"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      default: null,
    },
    entityId: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    requestId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activityLogSchema.index({ shopId: 1, createdAt: -1 });
activityLogSchema.index({ shopId: 1, action: 1, createdAt: -1 });
activityLogSchema.index({ shopId: 1, channel: 1, createdAt: -1 });

// Keep ~18 months of activity by default
activityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 548 }
);

export default mongoose.model("ActivityLog", activityLogSchema);

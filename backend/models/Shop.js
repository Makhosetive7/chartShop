import mongoose from "mongoose";

/**
 * Shop = business / tenant. Login credentials and channel links live on User.
 * Legacy fields (username, pin, channels, …) may still exist on old documents
 * until migrateUsersFromShops runs; they are not used by auth after migration.
 */
const shopSchema = new mongoose.Schema({
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
    maxlength: 500,
  },
  /** Admin/disable flag — disables the whole business for every user. */
  isActive: {
    type: Boolean,
    default: true,
  },
  /** Shared read-only demo shop for marketing try-before-register. */
  isDemo: {
    type: Boolean,
    default: false,
  },
  /** Sector key when isDemo — e.g. groceries, clothing, jewellery. */
  demoSector: {
    type: String,
    default: null,
    trim: true,
    lowercase: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
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
  /**
   * Owner / pocket top-ups so the till can stay coherent when an expense
   * is paid with money that never went through recorded sales.
   */
  ownerCashIns: [
    {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      note: {
        type: String,
        default: "Owner cash in",
        trim: true,
      },
      createdByUserId: {
        type: String,
        default: null,
      },
    },
  ],
});

shopSchema.index({ businessName: 1 });
shopSchema.index({ isDemo: 1, demoSector: 1 });

export default mongoose.model("Shop", shopSchema);

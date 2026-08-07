import mongoose from "mongoose";
import {
  buildDefaultVariant,
  syncProductMirrors,
} from "../utils/productVariants.js";

const packSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      default: "Single",
    },
    unitsPerPack: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    barcode: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const variantSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: "",
    },
    baseUnit: {
      type: String,
      default: "piece",
    },
    price: {
      type: Number,
      required: true,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 2,
    },
    trackStock: {
      type: Boolean,
      default: true,
    },
    barcode: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    packs: {
      type: [packSchema],
      default: [],
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  /**
   * Mirror of primary variant price (legacy + list views).
   * Source of truth for multi-variant catalogs is variants[].
   */
  price: {
    type: Number,
    required: true,
  },
  /** Mirror of primary variant cost */
  costPrice: {
    type: Number,
    min: 0,
    default: null,
  },
  /** Sum of tracked variant stocks */
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  /** Mirror of primary variant threshold */
  lowStockThreshold: {
    type: Number,
    default: 2,
  },
  /** True if any active variant tracks stock */
  trackStock: {
    type: Boolean,
    default: true,
  },
  variants: {
    type: [variantSchema],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdByUserId: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

productSchema.index({ shopId: 1, name: 1 });
productSchema.index({ shopId: 1, isActive: 1 });

productSchema.pre("validate", function ensureVariantTree(next) {
  if (!this.variants || this.variants.length === 0) {
    this.variants = [
      buildDefaultVariant({
        price: this.price,
        costPrice: this.costPrice,
        stock: this.stock ?? 0,
        lowStockThreshold: this.lowStockThreshold ?? 10,
        trackStock: this.trackStock !== false,
      }),
    ];
  }
  for (const variant of this.variants) {
    if (!variant.packs || variant.packs.length === 0) {
      variant.packs = [
        {
          label: "Single",
          unitsPerPack: 1,
          price: variant.price,
          costPrice: variant.costPrice ?? null,
          isActive: true,
          sortOrder: 0,
        },
      ];
    }
  }
  syncProductMirrors(this);
  next();
});

export default mongoose.model("Product", productSchema);

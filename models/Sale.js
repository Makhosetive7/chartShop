import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      productName: String,
      quantity: Number,
      price: Number,
      total: Number,
    },
  ],
  total: {
    type: Number,
    required: true,
  },
  isCancelled: {
    type: Boolean,
    default: false,
  },
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: String,
  originalSaleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Sale", saleSchema);

import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  type: {
    type: String,
    enum: ["cash", "credit", "laybye", "completed_laybye"],
    default: "cash",
  },
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "completed",
  },
  // for credit sales
  amountPaid: {
    type: Number,
    default: 0,
  },
  balanceDue: {
    type: Number,
    default: 0,
  },
    profit: { 
    type: Number, 
    default: 0 
  },
  // for laybye
  installments: [
    {
      amount: Number,
      date: Date,
      paymentMethod: String,
    },
  ],
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
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  customerName: String,
  customerPhone: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Sale", saleSchema);

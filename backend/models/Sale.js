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
  /** Agreed payment date for credit sales. Null on cash / existing sales. */
  dueDate: {
    type: Date,
    default: null,
  },
  /** Reminder slots already sent: "before", "due", "overdue:3", … "overdue:30". */
  creditReminderKeys: {
    type: [String],
    default: [],
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
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      variantLabel: { type: String, default: "" },
      packId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      packLabel: { type: String, default: "" },
      unitsPerPack: { type: Number, default: 1 },
      /** Base units removed from variant stock (quantity × unitsPerPack). */
      baseUnitsDeducted: { type: Number, default: null },
      quantity: Number,
      price: Number,
      standardPrice: Number,
      isCustomPrice: Boolean,
      costPrice: Number,
      costTotal: Number,
      total: Number,
    },
  ],
  total: {
    type: Number,
    required: true,
  },
  /** Sum of line costTotals when products had costPrice; else 0 */
  costTotal: {
    type: Number,
    default: 0,
  },
  profit: {
    type: Number,
    default: 0,
  },
  isCancelled: {
    type: Boolean,
    default: false,
  },
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: String,
  /** User who recorded the sale (multi-user attribution). */
  createdByUserId: {
    type: String,
    default: null,
    index: true,
  },
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
  /** Set when this sale was created by completing an order. */
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null,
    index: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

saleSchema.index({ type: 1, isCancelled: 1, dueDate: 1 });

export default mongoose.model("Sale", saleSchema);

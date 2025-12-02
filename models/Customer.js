import mongoose from "mongoose";

// Credit transaction schema
const creditTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'payment'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  items: [{
    productName: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  balanceBefore: Number,
  balanceAfter: Number
});

const customerSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  totalVisits: {
    type: Number,
    default: 0,
  },
  lastPurchaseDate: Date,
  firstPurchaseDate: Date,
  
  // Enhanced Credit/Debt tracking
  currentBalance: {
    type: Number,
    default: 0,
  },
  creditLimit: {
    type: Number,
    default: 0,
  },
  
  // Credit transaction history
  creditTransactions: [creditTransactionSchema],
  
  loyaltyPoints: {
    type: Number,
    default: 0,
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure unique customers per shop
customerSchema.index({ shopId: 1, phone: 1 }, { unique: true });

// Method to add credit transaction
customerSchema.methods.addCreditTransaction = async function(amount, items, description) {
  const balanceBefore = this.currentBalance;
  this.currentBalance += amount;
  const balanceAfter = this.currentBalance;

  this.creditTransactions.push({
    type: 'credit',
    amount,
    items: items || [],
    description,
    date: new Date(),
    balanceBefore,
    balanceAfter
  });

  await this.save();
  return this;
};

// Method to record payment
customerSchema.methods.recordPayment = async function(amount, description) {
  const balanceBefore = this.currentBalance;
  this.currentBalance -= amount;
  if (this.currentBalance < 0) this.currentBalance = 0;
  const balanceAfter = this.currentBalance;

  this.creditTransactions.push({
    type: 'payment',
    amount,
    items: [],
    description,
    date: new Date(),
    balanceBefore,
    balanceAfter
  });

  await this.save();
  return this;
};

export default mongoose.model("Customer", customerSchema);
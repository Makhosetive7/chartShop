import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  shopId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shop', 
    required: true 
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer' 
  },
  customerName: String,
  customerPhone: String,
  items: [{
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    },
    productName: String,
    quantity: Number,
    price: Number, // Price at time of order
    total: Number
  }],
  total: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  orderType: {
    type: String,
    enum: ['pickup', 'delivery', 'reservation'],
    default: 'pickup'
  },
  pickupDate: Date,
  deliveryAddress: String,
  deliveryFee: { type: Number, default: 0 },
  notes: String,
  orderDate: { type: Date, default: Date.now },
  confirmedAt: Date,
  readyAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  advancePayment: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  }
});

export default mongoose.model('Order', orderSchema);
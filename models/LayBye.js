import mongoose from 'mongoose';

const laybyeSchema = new mongoose.Schema({
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
        price: Number,
        total: Number
    }],

    totalAmount: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    balanceDue: {
        type: Number,
        required: true
    },

    installments: [{
        amount: Number,
        date: {
            type: Date,
            default: Date.now
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'bank', 'mobile'],
            default: 'cash'
        }
    }],

    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },

    startDate: {
        type: Date,
        default: Date.now
    },
    completedDate: Date,
    dueDate: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
    },

    notes: String,
    reservedStock: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
laybyeSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('LayBye', laybyeSchema);
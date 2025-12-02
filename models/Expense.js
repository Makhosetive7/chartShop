import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  shopId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shop', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'supplies',        
      'utilities',       
      'rent',           
      'salary',         
      'transport',      
      'marketing',     
      'maintenance',   
      'taxes',         
      'insurance',    
      'packaging',    
      'other' 
    ],
    default: 'other'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank', 'mobile', 'credit', 'other'],
    default: 'cash'
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  receiptNumber: String, 
  isRecurring: { 
    type: Boolean, 
    default: false 
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null],
    default: null
  }
});

export default mongoose.model('Expense', expenseSchema);
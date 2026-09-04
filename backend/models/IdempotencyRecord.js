import mongoose from 'mongoose';

const idempotencyRecordSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  result: {
    type: String, // JSON serialized result
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }
}, {
  timestamps: false // We handle timestamps manually
});

// Index for efficient lookups and cleanup
idempotencyRecordSchema.index({ key: 1 });
idempotencyRecordSchema.index({ expiresAt: 1 });

const IdempotencyRecord = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);

export default IdempotencyRecord;
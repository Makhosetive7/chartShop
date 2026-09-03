import mongoose from 'mongoose';

/**
 * Transaction utility for ChartShop reliability improvements.
 * 
 * Provides consistent transaction handling across services with fallback
 * for standalone MongoDB instances (common in dev/free deployments).
 * 
 * Usage:
 * const result = await withOptionalTransaction(async (session) => {
 *   await Model1.create([...], { session });
 *   await Model2.findByIdAndUpdate(id, update, { session });
 *   return someValue;
 * });
 */

/**
 * Run work inside a MongoDB transaction when supported; otherwise run without session.
 * 
 * @param {Function} work - Async function that receives (session) and performs work
 * @returns {Promise} - Result from the work function
 * 
 * Pattern adapted from CancellationService for consistency.
 * 
 * Behavior:
 * - On replica set: uses real transactions with commit/abort
 * - On standalone MongoDB: runs without session (acceptable for dev/demo)
 * - Throws original error if not a "no replica set" error
 */
export async function withOptionalTransaction(work) {
  let session = null;
  
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    
    const result = await work(session);
    await session.commitTransaction();
    return result;
    
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (_) {
        // Ignore abort errors (session may be invalid)
      }
    }

    // Check if this is a "standalone MongoDB" error
    const needsFallback = /replica set|transactions? (are|is) not supported|Transaction numbers/i.test(
      error.message || ""
    );

    if (needsFallback) {
      // Retry without transaction
      console.warn('MongoDB transactions not supported, falling back to sequential writes');
      return await work(null);
    }

    // Re-throw other errors
    throw error;
    
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

/**
 * Idempotency helper for operations that should only run once.
 * 
 * @param {String} key - Unique key for this operation
 * @param {Function} work - Async function to run if not already done
 * @param {Object} options - Options { ttlSeconds: 300, keyPrefix: 'idempotent:' }
 * @returns {Promise} - Result from work function or cached result
 * 
 * Uses MongoDB to track completed operations. Useful for:
 * - Order completion (prevent double-apply)
 * - Payment processing
 * - Any operation that shouldn't repeat on retry
 */
export async function withIdempotency(key, work, options = {}) {
  const { ttlSeconds = 300, keyPrefix = 'idempotent:' } = options;
  const fullKey = keyPrefix + key;
  
  // Try to insert idempotency record
  try {
    const IdempotencyRecord = mongoose.model('IdempotencyRecord');
    
    // Attempt to create the record (will fail if already exists)
    const record = await IdempotencyRecord.create({
      key: fullKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000)
    });
    
    try {
      // Run the work
      const result = await work();
      
      // Store the result in the idempotency record
      record.result = JSON.stringify(result);
      record.completed = true;
      await record.save();
      
      return result;
      
    } catch (error) {
      // Clean up the record on failure so operation can be retried
      await IdempotencyRecord.deleteOne({ _id: record._id });
      throw error;
    }
    
  } catch (error) {
    // If record already exists, check if completed
    if (error.code === 11000) { // Duplicate key error
      const existingRecord = await mongoose.model('IdempotencyRecord').findOne({ key: fullKey });
      
      if (existingRecord && existingRecord.completed) {
        // Return cached result
        return JSON.parse(existingRecord.result || 'null');
      }
      
      // Record exists but not completed - operation is in progress
      throw new Error('Operation already in progress');
    }
    
    throw error;
  }
}

/**
 * Simple retry wrapper for transient failures.
 * 
 * @param {Function} work - Async function to retry
 * @param {Object} options - Options { maxRetries: 3, delayMs: 100, backoff: 2 }
 * @returns {Promise} - Result from successful attempt
 */
export async function withRetry(work, options = {}) {
  const { maxRetries = 3, delayMs = 100, backoff = 2 } = options;
  
  let lastError;
  let delay = delayMs;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      
      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry certain types of errors
      if (error.name === 'ValidationError' || error.code === 11000) {
        throw error;
      }
      
      // Wait before retry
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoff;
      }
    }
  }
  
  throw lastError;
}

export default {
  withOptionalTransaction,
  withIdempotency,
  withRetry
};
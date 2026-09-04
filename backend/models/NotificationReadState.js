import mongoose from 'mongoose';

/**
 * NotificationReadState Model
 * 
 * Tracks which notifications a user has seen, replacing localStorage-based tracking.
 * Enables cross-device sync and team notification sharing.
 */

const notificationReadStateSchema = new mongoose.Schema({
  // Shop and user identification
  shopId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'Shop',
    index: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User',
    index: true
  },
  
  // Seen notification keys (same format as localStorage implementation)
  seenKeys: [{
    type: String,
    validate: {
      validator: function(key) {
        // Validate key format matches existing patterns
        return /^(alert:|stock:|order:|laybye:|\w+:\w+)/.test(key);
      },
      message: 'Invalid notification key format'
    }
  }],
  
  // Track when read state was last updated
  lastUpdated: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  
  // Metadata for debugging and analytics
  deviceInfo: {
    userAgent: { type: String, default: null },
    lastSyncSource: { 
      type: String, 
      enum: ['web', 'mobile', 'migration', 'api'],
      default: 'api'
    }
  }
}, { 
  timestamps: true,
  // Optimize for read-heavy workload
  read: 'secondaryPreferred'
});

// Compound unique index for efficient user queries
notificationReadStateSchema.index({ shopId: 1, userId: 1 }, { unique: true });

// Index for cleanup operations (TTL on old states)
notificationReadStateSchema.index({ lastUpdated: 1 });

// Static methods for common operations
notificationReadStateSchema.statics.getUserReadState = async function(shopId, userId) {
  const state = await this.findOne({ shopId, userId });
  return state ? state.seenKeys : [];
};

notificationReadStateSchema.statics.updateUserReadState = async function(shopId, userId, seenKeys, options = {}) {
  const { merge = true, deviceInfo = {} } = options;
  
  const updateData = {
    lastUpdated: new Date(),
    'deviceInfo.lastSyncSource': deviceInfo.lastSyncSource || 'api',
    'deviceInfo.userAgent': deviceInfo.userAgent || null
  };
  
  if (merge) {
    // Merge with existing keys (add new ones)
    const existing = await this.findOne({ shopId, userId });
    const existingKeys = existing ? existing.seenKeys : [];
    const mergedKeys = [...new Set([...existingKeys, ...seenKeys])];
    updateData.seenKeys = mergedKeys;
  } else {
    // Replace all keys
    updateData.seenKeys = [...new Set(seenKeys)];
  }
  
  const result = await this.findOneAndUpdate(
    { shopId, userId },
    updateData,
    { upsert: true, new: true }
  );
  
  return result.seenKeys;
};

notificationReadStateSchema.statics.migrateFromLocalStorage = async function(shopId, userId, localStorageKeys, deviceInfo = {}) {
  // One-time migration from localStorage to server
  const existing = await this.findOne({ shopId, userId });
  
  if (existing) {
    // User already has server state, merge carefully
    const mergedKeys = [...new Set([...existing.seenKeys, ...localStorageKeys])];
    return await this.updateUserReadState(shopId, userId, mergedKeys, {
      merge: false,
      deviceInfo: { ...deviceInfo, lastSyncSource: 'migration' }
    });
  } else {
    // First time migration
    return await this.updateUserReadState(shopId, userId, localStorageKeys, {
      merge: false,
      deviceInfo: { ...deviceInfo, lastSyncSource: 'migration' }
    });
  }
};

notificationReadStateSchema.statics.cleanupStaleStates = async function(daysOld = 90) {
  // Remove read states older than specified days (cleanup job)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  
  const result = await this.deleteMany({
    lastUpdated: { $lt: cutoff }
  });
  
  return result.deletedCount;
};

// Instance methods
notificationReadStateSchema.methods.addSeenKeys = function(keys) {
  const uniqueKeys = [...new Set([...this.seenKeys, ...keys])];
  this.seenKeys = uniqueKeys;
  this.lastUpdated = new Date();
  return this.save();
};

notificationReadStateSchema.methods.removeSeenKeys = function(keysToRemove) {
  this.seenKeys = this.seenKeys.filter(key => !keysToRemove.includes(key));
  this.lastUpdated = new Date();
  return this.save();
};

notificationReadStateSchema.methods.hasSeenKey = function(key) {
  return this.seenKeys.includes(key);
};

const NotificationReadState = mongoose.model('NotificationReadState', notificationReadStateSchema);

export default NotificationReadState;
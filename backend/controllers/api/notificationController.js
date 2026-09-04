import NotificationReadState from '../../models/NotificationReadState.js';
import { getErrorMessage } from '../../utils/errorUtils.js';

/**
 * Notification Read State Controller
 * 
 * Manages server-side notification read/unread state for cross-device sync.
 * Replaces localStorage-based tracking with persistent server state.
 */

export const getReadState = async (req, res) => {
  try {
    const { shopId } = req.shop;
    const { userId } = req.user;
    
    const seenKeys = await NotificationReadState.getUserReadState(shopId, userId);
    
    const readState = await NotificationReadState.findOne({ shopId, userId });
    
    res.json({
      success: true,
      seenKeys,
      lastUpdated: readState?.lastUpdated?.toISOString() || null,
      count: seenKeys.length
    });
  } catch (error) {
    console.error('[notifications] Error getting read state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification read state',
      message: getErrorMessage(error)
    });
  }
};

export const updateReadState = async (req, res) => {
  try {
    const { shopId } = req.shop;
    const { userId } = req.user;
    const { seenKeys = [], merge = true } = req.body;
    
    // Validate input
    if (!Array.isArray(seenKeys)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input: seenKeys must be an array'
      });
    }
    
    // Filter out invalid keys
    const validKeys = seenKeys.filter(key => 
      typeof key === 'string' && key.length > 0 && key.length < 200
    );
    
    if (validKeys.length !== seenKeys.length) {
      console.warn(`[notifications] Filtered out ${seenKeys.length - validKeys.length} invalid keys`);
    }
    
    // Extract device info from request
    const deviceInfo = {
      userAgent: req.get('User-Agent'),
      lastSyncSource: req.body.source || 'api'
    };
    
    const updatedKeys = await NotificationReadState.updateUserReadState(
      shopId, 
      userId, 
      validKeys, 
      { merge, deviceInfo }
    );
    
    res.json({
      success: true,
      seenKeys: updatedKeys,
      count: updatedKeys.length,
      merged: merge,
      added: merge ? validKeys.length : null
    });
  } catch (error) {
    console.error('[notifications] Error updating read state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification read state',
      message: getErrorMessage(error)
    });
  }
};

export const addSeenKeys = async (req, res) => {
  try {
    const { shopId } = req.shop;
    const { userId } = req.user;
    const { keys = [] } = req.body;
    
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input: keys must be a non-empty array'
      });
    }
    
    const validKeys = keys.filter(key => 
      typeof key === 'string' && key.length > 0 && key.length < 200
    );
    
    const deviceInfo = {
      userAgent: req.get('User-Agent'),
      lastSyncSource: 'api'
    };
    
    const updatedKeys = await NotificationReadState.updateUserReadState(
      shopId, 
      userId, 
      validKeys, 
      { merge: true, deviceInfo }
    );
    
    res.json({
      success: true,
      seenKeys: updatedKeys,
      count: updatedKeys.length,
      added: validKeys.length
    });
  } catch (error) {
    console.error('[notifications] Error adding seen keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add seen keys',
      message: getErrorMessage(error)
    });
  }
};

export const migrateLocalStorage = async (req, res) => {
  try {
    const { shopId } = req.shop;
    const { userId } = req.user;
    const { localStorageKeys = [] } = req.body;
    
    if (!Array.isArray(localStorageKeys)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input: localStorageKeys must be an array'
      });
    }
    
    const validKeys = localStorageKeys.filter(key => 
      typeof key === 'string' && key.length > 0 && key.length < 200
    );
    
    const deviceInfo = {
      userAgent: req.get('User-Agent'),
      lastSyncSource: 'migration'
    };
    
    const migratedKeys = await NotificationReadState.migrateFromLocalStorage(
      shopId,
      userId,
      validKeys,
      deviceInfo
    );
    
    res.json({
      success: true,
      seenKeys: migratedKeys,
      count: migratedKeys.length,
      migrated: validKeys.length,
      message: 'Successfully migrated localStorage read state to server'
    });
  } catch (error) {
    console.error('[notifications] Error migrating localStorage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to migrate localStorage read state',
      message: getErrorMessage(error)
    });
  }
};

export const clearReadState = async (req, res) => {
  try {
    const { shopId } = req.shop;
    const { userId } = req.user;
    
    await NotificationReadState.findOneAndDelete({ shopId, userId });
    
    res.json({
      success: true,
      message: 'Read state cleared successfully'
    });
  } catch (error) {
    console.error('[notifications] Error clearing read state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear read state',
      message: getErrorMessage(error)
    });
  }
};

// Admin/maintenance endpoint
export const getReadStateStats = async (req, res) => {
  try {
    const { shopId } = req.shop;
    
    const stats = await NotificationReadState.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalKeys: { $sum: { $size: '$seenKeys' } },
          avgKeysPerUser: { $avg: { $size: '$seenKeys' } },
          lastUpdated: { $max: '$lastUpdated' },
          oldestUpdated: { $min: '$lastUpdated' }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: stats[0] || {
        totalUsers: 0,
        totalKeys: 0,
        avgKeysPerUser: 0,
        lastUpdated: null,
        oldestUpdated: null
      }
    });
  } catch (error) {
    console.error('[notifications] Error getting read state stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get read state statistics',
      message: getErrorMessage(error)
    });
  }
};
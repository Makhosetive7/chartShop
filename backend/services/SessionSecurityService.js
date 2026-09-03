/**
 * Enhanced Session Security Service
 * 
 * Provides advanced session management capabilities for ChartShop:
 * - Session listing and revocation
 * - Security event monitoring  
 * - Session anomaly detection
 * - Bulk session operations
 */

import crypto from 'crypto';
import AuthSession from '../models/AuthSession.js';
import User from '../models/User.js';

class SessionSecurityService {
  
  /**
   * List all active sessions for a user/shop
   */
  async listUserSessions(shopId, options = {}) {
    try {
      const query = { shopId };
      
      if (options.userId) {
        query.userId = options.userId;
      }

      // Only active sessions (not expired)
      const now = new Date();
      query.expiresAt = { $gt: now };

      const sessions = await AuthSession.find(query)
        .sort({ createdAt: -1 })
        .select('sessionToken channelKey createdAt expiresAt lastActiveAt metadata')
        .lean();

      // Enhance with session info
      const enhancedSessions = sessions.map(session => ({
        id: session._id,
        token: this.maskToken(session.sessionToken),
        channel: this.getChannelType(session.channelKey),
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActiveAt: session.lastActiveAt || session.createdAt,
        isCurrentSession: options.currentToken && session.sessionToken === options.currentToken,
        deviceInfo: this.parseDeviceInfo(session.metadata),
        riskLevel: this.assessSessionRisk(session)
      }));

      return {
        success: true,
        sessions: enhancedSessions,
        total: enhancedSessions.length
      };

    } catch (error) {
      console.error('List user sessions error:', error);
      return {
        success: false,
        message: 'Failed to list sessions'
      };
    }
  }

  /**
   * Revoke specific session(s)
   */
  async revokeSessions(shopId, sessionIds, options = {}) {
    try {
      const query = { 
        shopId,
        _id: { $in: sessionIds }
      };

      // Don't revoke current session unless explicitly requested
      if (options.currentToken && !options.includeCurrent) {
        query.sessionToken = { $ne: options.currentToken };
      }

      const result = await AuthSession.deleteMany(query);

      return {
        success: true,
        revokedCount: result.deletedCount,
        message: `Revoked ${result.deletedCount} session${result.deletedCount !== 1 ? 's' : ''}`
      };

    } catch (error) {
      console.error('Revoke sessions error:', error);
      return {
        success: false,
        message: 'Failed to revoke sessions'
      };
    }
  }

  /**
   * Revoke all sessions for a user (except current)
   */
  async revokeAllUserSessions(shopId, options = {}) {
    try {
      const query = { shopId };

      if (options.userId) {
        query.userId = options.userId;
      }

      // Keep current session unless explicitly requested to revoke
      if (options.currentToken && !options.includeCurrent) {
        query.sessionToken = { $ne: options.currentToken };
      }

      const result = await AuthSession.deleteMany(query);

      return {
        success: true,
        revokedCount: result.deletedCount,
        message: result.deletedCount > 0 
          ? `Signed out of ${result.deletedCount} other device${result.deletedCount !== 1 ? 's' : ''}`
          : 'No other sessions to revoke'
      };

    } catch (error) {
      console.error('Revoke all sessions error:', error);
      return {
        success: false,
        message: 'Failed to revoke sessions'
      };
    }
  }

  /**
   * Revoke sessions on credential change (PIN change, recovery)
   */
  async revokeSessionsOnCredentialChange(shopId, userId, reason = 'credential_change') {
    try {
      console.log(`Revoking sessions due to ${reason} for shop ${shopId}`);

      const result = await AuthSession.deleteMany({ 
        shopId,
        userId: userId || { $exists: true } // Revoke for specific user or all users in shop
      });

      // Log security event
      await this.logSecurityEvent(shopId, userId, 'sessions_revoked', {
        reason,
        sessionCount: result.deletedCount,
        timestamp: new Date()
      });

      return {
        success: true,
        revokedCount: result.deletedCount
      };

    } catch (error) {
      console.error('Credential change session revocation error:', error);
      return {
        success: false,
        revokedCount: 0
      };
    }
  }

  /**
   * Detect suspicious session activity
   */
  async detectSessionAnomalies(shopId) {
    try {
      const sessions = await AuthSession.find({ shopId }).lean();
      const anomalies = [];

      // Group sessions by user
      const sessionsByUser = {};
      sessions.forEach(session => {
        const userId = session.userId || 'anonymous';
        if (!sessionsByUser[userId]) {
          sessionsByUser[userId] = [];
        }
        sessionsByUser[userId].push(session);
      });

      // Check for anomalies
      for (const [userId, userSessions] of Object.entries(sessionsByUser)) {
        // Multiple simultaneous sessions from different channels
        if (userSessions.length > 3) {
          anomalies.push({
            type: 'multiple_sessions',
            userId,
            sessionCount: userSessions.length,
            risk: 'medium'
          });
        }

        // Sessions with suspicious timing patterns
        const recentSessions = userSessions.filter(s => 
          Date.now() - new Date(s.createdAt).getTime() < 24 * 60 * 60 * 1000
        );

        if (recentSessions.length > 5) {
          anomalies.push({
            type: 'rapid_session_creation',
            userId,
            recentCount: recentSessions.length,
            risk: 'high'
          });
        }
      }

      return {
        success: true,
        anomalies,
        totalSessions: sessions.length
      };

    } catch (error) {
      console.error('Session anomaly detection error:', error);
      return {
        success: false,
        anomalies: []
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const now = new Date();
      const result = await AuthSession.deleteMany({
        expiresAt: { $lt: now }
      });

      console.log(`Cleaned up ${result.deletedCount} expired sessions`);
      
      return {
        success: true,
        cleanedCount: result.deletedCount
      };

    } catch (error) {
      console.error('Session cleanup error:', error);
      return {
        success: false,
        cleanedCount: 0
      };
    }
  }

  /**
   * Get session security summary for a shop
   */
  async getSessionSecuritySummary(shopId) {
    try {
      const now = new Date();
      
      const [
        totalSessions,
        activeSessions,
        recentSessions,
        anomalies
      ] = await Promise.all([
        AuthSession.countDocuments({ shopId }),
        AuthSession.countDocuments({ shopId, expiresAt: { $gt: now } }),
        AuthSession.countDocuments({ 
          shopId, 
          createdAt: { $gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }),
        this.detectSessionAnomalies(shopId)
      ]);

      return {
        success: true,
        summary: {
          totalSessions,
          activeSessions,
          recentSessions,
          anomalyCount: anomalies.anomalies?.length || 0,
          riskLevel: this.calculateOverallRisk(anomalies.anomalies || [])
        }
      };

    } catch (error) {
      console.error('Session security summary error:', error);
      return {
        success: false,
        summary: null
      };
    }
  }

  // Helper methods

  maskToken(token) {
    if (!token || token.length < 8) return '***';
    return token.substring(0, 4) + '...' + token.substring(token.length - 4);
  }

  getChannelType(channelKey) {
    if (!channelKey) return 'web';
    if (channelKey.startsWith('tg:')) return 'telegram';
    if (channelKey.startsWith('wa:')) return 'whatsapp';
    if (channelKey.includes('@')) return 'web';
    return 'unknown';
  }

  parseDeviceInfo(metadata) {
    try {
      if (typeof metadata === 'string') {
        const parsed = JSON.parse(metadata);
        return {
          userAgent: parsed.userAgent || 'Unknown',
          platform: this.extractPlatform(parsed.userAgent || ''),
          browser: this.extractBrowser(parsed.userAgent || '')
        };
      }
      return { userAgent: 'Unknown', platform: 'Unknown', browser: 'Unknown' };
    } catch (e) {
      return { userAgent: 'Unknown', platform: 'Unknown', browser: 'Unknown' };
    }
  }

  extractPlatform(userAgent) {
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad/i.test(userAgent)) return 'iOS';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(userAgent)) return 'Mac';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Unknown';
  }

  extractBrowser(userAgent) {
    if (/Chrome/i.test(userAgent)) return 'Chrome';
    if (/Firefox/i.test(userAgent)) return 'Firefox';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
    if (/Edge/i.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  assessSessionRisk(session) {
    const now = Date.now();
    const age = now - new Date(session.createdAt).getTime();
    const lastActive = session.lastActiveAt ? 
      now - new Date(session.lastActiveAt).getTime() : age;

    // Very old session
    if (age > 30 * 24 * 60 * 60 * 1000) return 'high';
    
    // Long inactive
    if (lastActive > 7 * 24 * 60 * 60 * 1000) return 'medium';
    
    return 'low';
  }

  calculateOverallRisk(anomalies) {
    if (!anomalies || anomalies.length === 0) return 'low';
    
    const highRiskCount = anomalies.filter(a => a.risk === 'high').length;
    const mediumRiskCount = anomalies.filter(a => a.risk === 'medium').length;
    
    if (highRiskCount > 0) return 'high';
    if (mediumRiskCount > 1) return 'medium';
    if (mediumRiskCount > 0 || anomalies.length > 0) return 'medium';
    
    return 'low';
  }

  async logSecurityEvent(shopId, userId, eventType, details) {
    try {
      // This could be expanded to use a dedicated SecurityLog model
      console.log(`Security event [${shopId}]: ${eventType}`, details);
      
      // For now, we log to console, but this could be enhanced to:
      // - Store in a SecurityLog collection
      // - Send alerts for critical events
      // - Integrate with monitoring systems
      
    } catch (error) {
      console.error('Security event logging error:', error);
    }
  }
}

export default new SessionSecurityService();
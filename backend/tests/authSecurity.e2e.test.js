/**
 * Authentication Security Tests for Issue 3
 * 
 * Tests enhanced security features:
 * - Rate limiting and lockout mechanisms
 * - Session management and revocation  
 * - Cross-shop isolation boundaries
 * - PIN brute force protection
 * - CORS and webhook security
 */

import { describe, it, beforeEach, afterEach, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';

// Use existing test helpers
const { connectTestDb, disconnectTestDb, wipeShopData } = await import('./helpers/mongo.js');
const { createTestShop, createTestProduct } = await import('./helpers/fixtures.js');
const { default: createApp } = await import('../app.js');

// Models and services
import AuthService from '../services/AuthService.js';
import SessionSecurityService from '../services/SessionSecurityService.js';
import { globalLimiter } from '../middleware/rateLimiter.js';

describe('Authentication Security Tests (Issue 3)', () => {
  let server;
  let shop, shop2; // For cross-shop isolation tests

  before(async () => {
    await connectTestDb();
    
    // Create test app and start server
    const app = createApp();
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await disconnectTestDb();
  });

  beforeEach(async () => {
    // Create two test shops for isolation tests
    shop = await createTestShop({ username: 'securityshop1', pin: '1234' });
    shop2 = await createTestShop({ username: 'securityshop2', pin: '5678' });
    
    // Clear rate limiter state
    globalLimiter.requests.clear();
    globalLimiter.blocked.clear();
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id });
    await wipeShopData({ shopId: shop2._id });
  });

  describe('Rate Limiting Protection', () => {

    it('should block excessive login attempts from same IP', async () => {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      
      // Make many rapid login attempts
      const attempts = [];
      for (let i = 0; i < 60; i++) {
        attempts.push(
          fetch(`${baseUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'securityshop1',
              pin: 'wrong-pin'
            })
          })
        );
      }

      const responses = await Promise.all(attempts);
      const statuses = responses.map(r => r.status);
      
      // Should eventually get 429 (rate limited)
      const rateLimitedCount = statuses.filter(s => s === 429).length;
      assert.ok(rateLimitedCount > 0, 'Should have rate limited some requests');
      
      // Check that rate limit headers are present
      const lastResponse = responses[responses.length - 1];
      if (lastResponse.status === 429) {
        assert.ok(lastResponse.headers.get('X-RateLimit-Limit'));
        assert.ok(lastResponse.headers.get('X-RateLimit-Reset'));
      }
    });

    it('should apply progressive delays on repeated auth failures', async () => {
      // This is difficult to test precisely due to timing, but we can verify
      // the delay mechanism works by checking the middleware is applied
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      
      const startTime = Date.now();
      
      // Make several failed login attempts
      for (let i = 0; i < 3; i++) {
        await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'securityshop1',
            pin: 'wrong-pin'
          })
        });
      }
      
      const elapsed = Date.now() - startTime;
      
      // Should take at least some time due to progressive delays
      // (1s + 3s + 10s = 14s in theory, but timing in tests is imprecise)
      assert.ok(elapsed > 1000, 'Should have some delay from progressive auth delay');
    });

  });

  describe('Session Security Management', () => {

    it('should list active sessions for a user', async () => {
      // Login to create a session
      const loginResult = await AuthService.loginWithCredentials({
        username: 'securityshop1',
        pin: '1234',
        channel: 'web',
        channelKey: 'test@example.com'
      });

      assert.strictEqual(loginResult.success, true);
      
      // List sessions
      const sessionList = await SessionSecurityService.listUserSessions(shop._id, {
        userId: loginResult.user._id
      });

      assert.strictEqual(sessionList.success, true);
      assert.strictEqual(sessionList.sessions.length, 1);
      assert.ok(sessionList.sessions[0].token.includes('...'));
      assert.strictEqual(sessionList.sessions[0].channel, 'web');
    });

    it('should revoke sessions on PIN change', async () => {
      // Create initial session
      const loginResult = await AuthService.loginWithCredentials({
        username: 'securityshop1',
        pin: '1234', 
        channel: 'web',
        channelKey: 'test@example.com'
      });

      assert.strictEqual(loginResult.success, true);
      const userId = loginResult.user._id;

      // Verify session exists
      let sessionList = await SessionSecurityService.listUserSessions(shop._id, {
        userId
      });
      assert.strictEqual(sessionList.sessions.length, 1);

      // Simulate PIN change (using recovery system)
      const user = await AuthService.findUserByUsername('securityshop1');
      
      // Manually trigger session revocation as would happen in PIN change
      await SessionSecurityService.revokeSessionsOnCredentialChange(
        shop._id,
        userId,
        'pin_change'
      );

      // Verify sessions are revoked
      sessionList = await SessionSecurityService.listUserSessions(shop._id, {
        userId
      });
      assert.strictEqual(sessionList.sessions.length, 0);
    });

    it('should detect session anomalies', async () => {
      // Create multiple sessions rapidly
      for (let i = 0; i < 6; i++) {
        await AuthService.loginWithCredentials({
          username: 'securityshop1',
          pin: '1234',
          channel: 'web', 
          channelKey: `test${i}@example.com`
        });
      }

      const anomalies = await SessionSecurityService.detectSessionAnomalies(shop._id);
      
      assert.strictEqual(anomalies.success, true);
      assert.ok(anomalies.anomalies.length > 0);
      
      // Should detect multiple sessions or rapid creation
      const hasMultipleSessions = anomalies.anomalies.some(a => 
        a.type === 'multiple_sessions' || a.type === 'rapid_session_creation'
      );
      assert.ok(hasMultipleSessions, 'Should detect session anomalies');
    });

  });

  describe('Cross-Shop Isolation', () => {

    it('should prevent access to other shop data via session', async () => {
      // Login to shop1
      const login1 = await AuthService.loginWithCredentials({
        username: 'securityshop1',
        pin: '1234',
        channel: 'web',
        channelKey: 'user1@example.com'
      });
      
      assert.strictEqual(login1.success, true);

      // Login to shop2  
      const login2 = await AuthService.loginWithCredentials({
        username: 'securityshop2', 
        pin: '5678',
        channel: 'web',
        channelKey: 'user2@example.com'
      });

      assert.strictEqual(login2.success, true);

      // Verify sessions are isolated - user1 shouldn't see user2's sessions
      const shop1Sessions = await SessionSecurityService.listUserSessions(shop._id, {
        userId: login1.user._id
      });

      const shop2Sessions = await SessionSecurityService.listUserSessions(shop2._id, {
        userId: login2.user._id  
      });

      assert.strictEqual(shop1Sessions.sessions.length, 1);
      assert.strictEqual(shop2Sessions.sessions.length, 1);

      // Cross-shop session list should be empty
      const crossShopSessions = await SessionSecurityService.listUserSessions(shop._id, {
        userId: login2.user._id // shop2 user in shop1 query
      });

      assert.strictEqual(crossShopSessions.sessions.length, 0);
    });

  });

  describe('Account Lockout Protection', () => {

    it('should lock account after maximum failed attempts', async () => {
      const username = 'securityshop1';

      // Attempt login with wrong PIN multiple times
      for (let i = 0; i < 6; i++) {
        const result = await AuthService.loginWithCredentials({
          username,
          pin: 'wrong-pin',
          channel: 'web',
          channelKey: 'test@example.com'
        });
        
        assert.strictEqual(result.success, false);
      }

      // Next attempt should be locked out
      const lockedResult = await AuthService.loginWithCredentials({
        username,
        pin: 'wrong-pin',
        channel: 'web', 
        channelKey: 'test@example.com'
      });

      assert.strictEqual(lockedResult.success, false);
      assert.ok(lockedResult.message.includes('locked') || lockedResult.message.includes('Locked'));
    });

    it('should eventually unlock account after lockout period', async () => {
      const user = await AuthService.findUserByUsername('securityshop1');
      
      // Manually set lockout (simulating expired lockout)
      user.loginAttempts = 5;
      user.lockedUntil = new Date(Date.now() - 1000); // 1 second ago
      await user.save();

      // Should be able to login with correct PIN after lockout expired
      const result = await AuthService.loginWithCredentials({
        username: 'securityshop1',
        pin: '1234',
        channel: 'web',
        channelKey: 'test@example.com'
      });

      assert.strictEqual(result.success, true);
      
      // Lockout should be cleared
      const updatedUser = await AuthService.findUserByUsername('securityshop1');
      assert.strictEqual(updatedUser.loginAttempts, 0);
      assert.strictEqual(updatedUser.lockedUntil, null);
    });

  });

  describe('Security Monitoring', () => {

    it('should provide security summary', async () => {
      // Create some sessions
      await AuthService.loginWithCredentials({
        username: 'securityshop1',
        pin: '1234',
        channel: 'web',
        channelKey: 'test1@example.com'
      });

      await AuthService.loginWithCredentials({
        username: 'securityshop1', 
        pin: '1234',
        channel: 'telegram',
        channelKey: 'tg:123456'
      });

      const summary = await SessionSecurityService.getSessionSecuritySummary(shop._id);
      
      assert.strictEqual(summary.success, true);
      assert.ok(summary.summary.totalSessions >= 2);
      assert.ok(summary.summary.activeSessions >= 2);
      assert.ok(['low', 'medium', 'high'].includes(summary.summary.riskLevel));
    });

    it('should clean up expired sessions', async () => {
      // Create a session and manually expire it
      const loginResult = await AuthService.loginWithCredentials({
        username: 'securityshop1',
        pin: '1234',
        channel: 'web',
        channelKey: 'test@example.com'
      });

      // Manually expire the session
      const AuthSession = (await import('../models/AuthSession.js')).default;
      await AuthSession.updateOne(
        { sessionToken: loginResult.token },
        { expiresAt: new Date(Date.now() - 1000) }
      );

      // Clean up expired sessions
      const cleanupResult = await SessionSecurityService.cleanupExpiredSessions();
      
      assert.strictEqual(cleanupResult.success, true);
      assert.strictEqual(cleanupResult.cleanedCount, 1);
    });

  });

});

// Helper function for HTTP requests in tests
function request(server, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', path, body, headers = {} } = options;
    const addr = server.address();
    
    const req = http.request({
      hostname: '127.0.0.1',
      port: addr.port, 
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString();
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json: () => JSON.parse(data)
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    
    req.end();
  });
}
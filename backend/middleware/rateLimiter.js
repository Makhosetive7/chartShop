/**
 * API Rate Limiting Middleware for ChartShop
 * 
 * Implements multiple layers of rate limiting to prevent abuse:
 * 1. Global API rate limiting 
 * 2. Authentication endpoint protection
 * 3. IP-based brute force protection
 * 
 * Designed for SME shops - balances security with usability.
 */

import { promisify } from 'util';

// Simple in-memory rate limiting (can be upgraded to Redis later)
class MemoryRateLimiter {
  constructor() {
    this.requests = new Map(); // IP -> { count, resetTime, blocked }
    this.blocked = new Map();  // IP -> blockUntil timestamp
    
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    
    // Clean up expired request counts
    for (const [ip, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(ip);
      }
    }
    
    // Clean up expired blocks
    for (const [ip, blockUntil] of this.blocked.entries()) {
      if (now > blockUntil) {
        this.blocked.delete(ip);
      }
    }
  }

  isBlocked(ip) {
    const blockUntil = this.blocked.get(ip);
    return blockUntil && Date.now() < blockUntil;
  }

  block(ip, durationMs) {
    const blockUntil = Date.now() + durationMs;
    this.blocked.set(ip, blockUntil);
    this.requests.delete(ip); // Clear request count when blocked
  }

  increment(ip, windowMs) {
    const now = Date.now();
    const key = ip;
    
    // Check if currently blocked
    if (this.isBlocked(ip)) {
      return { allowed: false, blocked: true, resetTime: this.blocked.get(ip) };
    }
    
    // Get or create request data
    let data = this.requests.get(key);
    if (!data || now > data.resetTime) {
      data = { count: 0, resetTime: now + windowMs };
      this.requests.set(key, data);
    }
    
    data.count++;
    
    return {
      allowed: true,
      count: data.count,
      resetTime: data.resetTime,
      remaining: Math.max(0, data.resetTime - now)
    };
  }

  getStatus(ip) {
    if (this.isBlocked(ip)) {
      return {
        blocked: true,
        blockUntil: this.blocked.get(ip)
      };
    }
    
    const data = this.requests.get(ip);
    return {
      blocked: false,
      count: data?.count || 0,
      resetTime: data?.resetTime || 0
    };
  }
}

// Singleton instance
const globalLimiter = new MemoryRateLimiter();

/**
 * Rate limiting configurations for different endpoint types
 */
const RATE_LIMITS = {
  // General API rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,        // 1000 requests per 15min per IP
    blockDuration: 5 * 60 * 1000, // 5 minute block
    message: 'Too many requests. Please try again later.',
  },
  
  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    maxRequests: 50,          // 50 auth attempts per 15min per IP
    blockDuration: 30 * 60 * 1000, // 30 minute block
    message: 'Too many login attempts. Please try again later.',
  },
  
  // Critical auth endpoints (very strict)  
  criticalAuth: {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxRequests: 10,          // 10 attempts per 5min per IP
    blockDuration: 60 * 60 * 1000, // 1 hour block
    message: 'Account security: Too many attempts. Try again in 1 hour.',
  }
};

/**
 * Create rate limiting middleware for specific configuration
 */
function createRateLimit(configName) {
  const config = RATE_LIMITS[configName];
  if (!config) {
    throw new Error(`Unknown rate limit config: ${configName}`);
  }

  return (req, res, next) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = getClientIP(req);
    
    // Check if IP is currently blocked
    if (globalLimiter.isBlocked(ip)) {
      const status = globalLimiter.getStatus(ip);
      const remainingMs = status.blockUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      
      console.warn(`Rate limit block active for IP ${ip}: ${remainingMin}min remaining`);
      
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: `${config.message} (${remainingMin} minutes remaining)`,
        retryAfter: Math.ceil(remainingMs / 1000)
      });
    }

    // Increment request count
    const result = globalLimiter.increment(ip, config.windowMs);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': config.maxRequests,
      'X-RateLimit-Remaining': Math.max(0, config.maxRequests - result.count),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    // Check if limit exceeded
    if (result.count > config.maxRequests) {
      // Block the IP for the configured duration
      globalLimiter.block(ip, config.blockDuration);
      
      const blockMin = Math.ceil(config.blockDuration / 60000);
      console.warn(`Rate limit exceeded for IP ${ip}: blocked for ${blockMin}min`);
      
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: `${config.message} (blocked for ${blockMin} minutes)`,
        retryAfter: Math.ceil(config.blockDuration / 1000)
      });
    }

    next();
  };
}

/**
 * Extract client IP address from request
 */
function getClientIP(req) {
  // Handle various proxy configurations
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Specialized middleware for progressive delays on repeated auth failures
 */
function createProgressiveAuthDelay() {
  const delays = new Map(); // IP -> { attempts, lastAttempt }
  
  // Base delays in milliseconds: 1s, 3s, 10s, 30s, 60s
  const DELAY_LEVELS = [1000, 3000, 10000, 30000, 60000];
  
  return async (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = getClientIP(req);
    const now = Date.now();
    
    // Get delay info for this IP
    let delayInfo = delays.get(ip);
    if (!delayInfo) {
      delayInfo = { attempts: 0, lastAttempt: 0 };
      delays.set(ip, delayInfo);
    }

    // Reset if last attempt was more than 1 hour ago
    if (now - delayInfo.lastAttempt > 60 * 60 * 1000) {
      delayInfo.attempts = 0;
    }

    // Calculate delay based on attempt count
    const delayIndex = Math.min(delayInfo.attempts, DELAY_LEVELS.length - 1);
    const delayMs = DELAY_LEVELS[delayIndex];
    
    if (delayMs > 0) {
      console.log(`Progressive auth delay for IP ${ip}: ${delayMs}ms (attempt ${delayInfo.attempts + 1})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Increment attempts for next time (will be reset on success or timeout)
    delayInfo.attempts++;
    delayInfo.lastAttempt = now;
    
    // Add reset function to request for successful auth
    req.resetAuthDelay = () => {
      const info = delays.get(ip);
      if (info) {
        info.attempts = 0;
      }
    };

    next();
  };
}

/**
 * Middleware to reset auth delays on successful login
 */
function resetAuthDelayOnSuccess(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Check if this looks like a successful auth response
    if (res.statusCode === 200 && typeof body === 'string') {
      try {
        const response = JSON.parse(body);
        if (response.success === true && response.token) {
          // Successful auth - reset delays
          if (req.resetAuthDelay) {
            req.resetAuthDelay();
          }
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

// Export middleware factories
export const apiRateLimit = createRateLimit('api');
export const authRateLimit = createRateLimit('auth');
export const criticalAuthRateLimit = createRateLimit('criticalAuth');
export const progressiveAuthDelay = createProgressiveAuthDelay();
export { resetAuthDelayOnSuccess };

// Export utilities for testing and monitoring
export { globalLimiter, RATE_LIMITS, getClientIP, MemoryRateLimiter };
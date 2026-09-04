# Production Deployment Guide: Issues 1-3

**Critical Safety Guide for Deploying ChartShop Issues 1-3**  
**Date**: September 3, 2026  
**Status**: ⚠️ **REQUIRES CAREFUL DEPLOYMENT**

---

## 🚨 **CRITICAL DEPLOYMENT REQUIREMENTS**

### **BREAKING CHANGES ALERT**

The following changes from Issues 1-3 **WILL BREAK PRODUCTION** if not properly configured:

| Component | Breaking Change | Required Action |
|-----------|----------------|-----------------|
| **CORS Security** | Fail-closed in production | ✅ **MUST set CORS_ORIGIN** |
| **Recovery Codes** | Required pepper in production | ✅ **MUST set RECOVERY_CODE_PEPPER** |
| **WhatsApp Webhooks** | Signature verification required | ✅ **MUST set WHATSAPP_APP_SECRET** |
| **Rate Limiting** | Immediately active | 🔍 **Monitor for false positives** |
| **Till Calculations** | Fixed double-subtract bugs | 📢 **User communication needed** |

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **Step 1: Critical Environment Variables (REQUIRED)**

```bash
# Generate secure secrets
RECOVERY_CODE_PEPPER=$(node -e "console.log(crypto.randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(crypto.randomBytes(32).toString('hex'))")
CRON_SECRET=$(node -e "console.log(crypto.randomBytes(16).toString('hex'))")

# Set production CORS (CRITICAL)
CORS_ORIGIN="https://chart-shop.vercel.app"  # Use your actual frontend domain

# Existing required vars (verify they exist)
MONGODB_URI="mongodb+srv://..."
TELEGRAM_BOT_TOKEN="..."
NODE_ENV="production"
```

### **Step 2: WhatsApp Configuration (If Enabled)**
```bash
# If WHATSAPP_ENABLED=true, these are REQUIRED
WHATSAPP_APP_SECRET="<from-meta-developer-console>"
WHATSAPP_TOKEN="<meta-permanent-token>"
WHATSAPP_PHONE_NUMBER_ID="<phone-number-id>"
WHATSAPP_VERIFY_TOKEN="<verify-token>"
```

### **Step 3: Backup Existing Data**
```bash
# Backup before deployment (till calculations will change)
mongodump --uri="$MONGODB_URI" --out="backup-$(date +%Y%m%d-%H%M)"
```

### **Step 4: Test Configuration**
```bash
# Test CORS configuration
curl -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS "https://your-api.com/api/v1/auth/login"
# Should return 403 or CORS error

# Test WhatsApp webhook (if enabled)
curl -X POST "https://your-api.com/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"test": "payload"}'
# Should return 401 without valid signature
```

---

## 🔍 **IMPACT ANALYSIS PER ISSUE**

### **Issue 1: Money Model Dictionary - USER VISIBLE CHANGES**

#### **Till Calculation Changes**
```diff
// BEFORE (Buggy)
- Till included cancelled sales twice (double subtract)
- Bank expenses drained physical till
- Credit cancels drained till incorrectly

// AFTER (Fixed)
+ Till = net non-cancelled cash sales only
+ Bank expenses don't drain till (labeled correctly)  
+ Credit cancels don't affect till (correct behavior)
```

#### **Expected User Impact**
- ✅ **Shops with cancelled sales**: Till will be **HIGHER** (bug fixed)
- ✅ **Shops with bank expenses**: Till will be **HIGHER** (correct now)
- 🔄 **Dashboard labels**: "Today Left" → "Operating Result"

#### **User Communication Template**
```
Subject: ChartShop Till Calculation Improvements

We've fixed several bugs in till calculations:

1. Cancelled sales no longer reduce your till twice
2. Bank/mobile expenses no longer drain your physical till
3. Dashboard now clearly shows "Operating Result" vs till cash

Your till may show higher amounts - this reflects the actual 
cash you should have. Contact support if you have questions.
```

### **Issue 2: Reliability Improvements - SAFE CHANGES**

#### **Changes Made**
- ✅ **New transaction utilities** (backwards compatible)
- ✅ **Order completion fixes** (prevents future data corruption)
- ✅ **New IdempotencyRecord collection** (doesn't affect existing data)

#### **Expected Impact**
- ✅ **No breaking changes** to existing accounts
- ✅ **Improved reliability** for new operations
- ✅ **Falls back gracefully** on standalone MongoDB

### **Issue 3: Security Hardening - CONFIGURATION CRITICAL**

#### **Rate Limiting Impact**
- **API Limit**: 1000 requests/15min per IP
- **Auth Limit**: 50 attempts/15min per IP  
- **Critical Auth**: 10 attempts/5min per IP

#### **Session Behavior Changes**
- ⚠️ **PIN changes now log out all devices**
- 🔄 **New session management endpoints**
- 📱 **Chat sessions still work normally**

#### **Security Activation**
- 🛡️ **Rate limiting active immediately**
- 🔒 **CORS enforcement in production**
- 📧 **WhatsApp signature verification required**

---

## 🚀 **DEPLOYMENT PROCEDURE**

### **Phase 1: Environment Setup (30 minutes)**

1. **Update production environment variables**:
   ```bash
   # Render/Railway/etc dashboard
   CORS_ORIGIN=https://chart-shop.vercel.app
   RECOVERY_CODE_PEPPER=<generated-64-char-hex>
   SESSION_SECRET=<generated-64-char-hex>
   CRON_SECRET=<generated-32-char-hex>
   
   # If WhatsApp enabled
   WHATSAPP_APP_SECRET=<from-meta-console>
   ```

2. **Verify existing variables**:
   - ✅ `MONGODB_URI` is set
   - ✅ `TELEGRAM_BOT_TOKEN` is set
   - ✅ `NODE_ENV=production`

### **Phase 2: Deploy Code (15 minutes)**

1. **Deploy application code**
2. **Monitor startup logs** for:
   - ✅ "CORS allowing validated origin: https://..."
   - ✅ No "RECOVERY_CODE_PEPPER not set" errors
   - ✅ Database connection successful

### **Phase 3: Validation (15 minutes)**

1. **Test frontend access**:
   ```bash
   # Should work from your frontend domain
   curl -H "Origin: https://chart-shop.vercel.app" \
     https://your-api.com/api/v1/auth/status
   
   # Should be blocked from other domains
   curl -H "Origin: https://malicious.com" \
     https://your-api.com/api/v1/auth/status
   ```

2. **Test authentication**:
   - ✅ Login works normally
   - ✅ Rate limiting blocks excessive attempts
   - ✅ Sessions work correctly

3. **Test WhatsApp** (if enabled):
   - ✅ Webhook still receives messages
   - ✅ Unsigned requests are rejected

### **Phase 4: Monitor (24 hours)**

1. **Watch for alerts**:
   - Rate limiting activation frequency
   - CORS violation attempts
   - Authentication failure spikes
   - Till calculation support requests

2. **User support readiness**:
   - Till explanation documentation ready
   - Session behavior change communication
   - Rate limiting explanation for blocked users

---

## 🆘 **ROLLBACK PROCEDURES**

### **Quick Rollback (Environment Only)**
```bash
# If CORS or auth issues, revert environment variables
CORS_ORIGIN="*"  # Emergency only - insecure
# Remove new security variables temporarily
```

### **Code Rollback (If Needed)**
```bash
# Rollback to previous release
git checkout <previous-release-tag>
# Deploy previous version

# Restore database if till changes caused major confusion
mongorestore backup-20260903-1400/
```

### **Partial Rollback (Feature Flags)**
If possible, implement feature flags for:
- Rate limiting activation
- New session management
- Updated till calculations

---

## 📊 **MONITORING DASHBOARD**

### **Critical Metrics to Watch**

| Metric | Normal Range | Alert Threshold | Action |
|--------|-------------|-----------------|---------|
| **Auth Success Rate** | >95% | <90% | Check rate limiting |
| **CORS Violations** | <10/hour | >50/hour | Verify origin config |
| **Rate Limit Blocks** | <50/hour | >200/hour | Adjust thresholds |
| **WhatsApp Webhook Failures** | <5/hour | >20/hour | Check signatures |
| **Session Management Usage** | N/A | Monitor adoption | User education |

### **Log Patterns to Monitor**
```bash
# Rate limiting activations
grep "Rate limit exceeded" logs/ | wc -l

# CORS violations  
grep "CORS policy violation" logs/ | wc -l

# Authentication failures
grep "Authentication failed" logs/ | wc -l

# Till calculation support tickets
grep -i "till.*wrong\|cash.*different" support-tickets/
```

---

## 📞 **SUPPORT PREPARATION**

### **Common User Questions**

**Q: "My till amount suddenly increased - is this correct?"**  
A: Yes, we fixed bugs where cancelled sales and bank expenses incorrectly reduced your till. The new amount reflects actual cash you should have.

**Q: "I got logged out when I changed my PIN"**  
A: This is a new security feature. Changing your PIN now logs you out of all devices to protect your account.

**Q: "I can't access ChartShop from my browser"**  
A: This may be a security configuration issue. Please contact support with your browser details.

**Q: "WhatsApp bot stopped responding"**  
A: We've enhanced WhatsApp security. If you're using WhatsApp integration, please contact support for configuration assistance.

### **Support Scripts**
```bash
# Check user's till calculation
node scripts/checkTillCalculation.js --shop-id=<id>

# Verify user's session status  
node scripts/checkUserSessions.js --username=<username>

# Test rate limiting for user's IP
node scripts/checkRateLimit.js --ip=<ip-address>
```

---

## ✅ **POST-DEPLOYMENT SUCCESS CRITERIA**

### **Technical Validation**
- ✅ App starts without errors
- ✅ CORS blocks unauthorized origins
- ✅ Rate limiting is active and proportional
- ✅ WhatsApp webhooks verify signatures
- ✅ Session management endpoints work
- ✅ Till calculations show consistent results

### **User Experience Validation**  
- ✅ Existing users can log in normally
- ✅ Shop operations work without disruption
- ✅ Till amounts are explained and understood
- ✅ Support tickets remain at normal levels

### **Security Validation**
- ✅ No successful brute force attacks
- ✅ No CORS bypass attempts succeed  
- ✅ No unsigned webhooks are processed
- ✅ Session security features work as intended

---

**🚀 DEPLOYMENT STATUS: READY WITH PROPER PREPARATION**

This deployment includes significant security improvements and bug fixes that will benefit all shops, but requires careful configuration to avoid disruption. Follow this guide step-by-step for a successful rollout.
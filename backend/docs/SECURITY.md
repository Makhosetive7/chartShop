# ChartShop Security Guide

This document covers security configuration, secret management, and operational security procedures for ChartShop deployments.

---

## 🔐 **Required Security Configuration**

### **Production Environment Variables**

These environment variables are **required** for secure production deployment:

```bash
# Database & Core
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/chartshop
NODE_ENV=production
PORT=3000

# Authentication & Sessions  
RECOVERY_CODE_PEPPER=<64-char-random-hex>
SESSION_SECRET=<64-char-random-hex>

# CORS Security
CORS_ORIGIN=https://your-frontend-domain.com

# Telegram Security
TELEGRAM_BOT_TOKEN=<bot-token-from-botfather>
TELEGRAM_WEBHOOK_SECRET=<32-char-random-hex>
WEBHOOK_URL=https://your-backend-domain.com/webhook/telegram

# WhatsApp Security (if enabled)
WHATSAPP_ENABLED=true
WHATSAPP_TOKEN=<meta-permanent-token>
WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
WHATSAPP_VERIFY_TOKEN=<random-string>
WHATSAPP_APP_SECRET=<meta-app-secret>  # Required for signature verification

# Cron Job Security
CRON_SECRET=<32-char-random-hex>
```

### **Secret Generation**

Generate cryptographically secure secrets:

```bash
# 64-character hex (for RECOVERY_CODE_PEPPER, SESSION_SECRET)
node -e "console.log(crypto.randomBytes(32).toString('hex'))"

# 32-character hex (for webhook secrets, CRON_SECRET)
node -e "console.log(crypto.randomBytes(16).toString('hex'))"

# Random string (for WHATSAPP_VERIFY_TOKEN)
node -e "console.log(crypto.randomBytes(16).toString('base64'))"
```

---

## 🛡️ **Security Features**

### **Multi-Layer Rate Limiting**

ChartShop implements comprehensive rate limiting:

| Endpoint Type | Limit | Window | Block Duration |
|---------------|--------|--------|----------------|
| **General API** | 1000 req/IP | 15 min | 5 min |
| **Auth Endpoints** | 50 req/IP | 15 min | 30 min |
| **Critical Auth** | 10 req/IP | 5 min | 1 hour |

**Progressive Auth Delays**: 1s → 3s → 10s → 30s → 60s per IP

### **Account Lockout Protection**

- **5 failed attempts** → 15-minute account lockout
- Applies to PIN login, recovery, and setup
- Automatic unlock after timeout
- Lockout cleared on successful authentication

### **Session Security**

- **Automatic revocation** on PIN changes
- **Session listing** and manual revocation  
- **Anomaly detection** for suspicious patterns
- **TTL-based cleanup** of expired sessions
- **Cross-device session management**

### **CORS Protection**

- **Fail-closed in production** (no wildcard fallback)
- **Origin validation** with format checking
- **Preflight security** for blocked origins

### **Webhook Security**

- **Telegram**: Required webhook secret verification
- **WhatsApp**: HMAC-SHA256 signature verification  
- **Timing-safe comparisons** for all signatures

---

## 🔄 **Secret Rotation Procedures**

### **Regular Rotation Schedule**

| Secret Type | Rotation Frequency | Priority |
|-------------|-------------------|----------|
| **Recovery Pepper** | Yearly | High |
| **Session Secret** | Yearly | High |
| **Webhook Secrets** | Quarterly | Medium |
| **Bot Tokens** | As needed | High |
| **WhatsApp Tokens** | As needed | Medium |

### **Recovery Code Pepper Rotation**

**⚠️ WARNING**: Rotating recovery pepper invalidates all existing recovery codes.

```bash
# 1. Generate new pepper
NEW_PEPPER=$(node -e "console.log(crypto.randomBytes(32).toString('hex'))")

# 2. Update environment variable
export RECOVERY_CODE_PEPPER=$NEW_PEPPER

# 3. Restart application
pm2 restart chartshop-backend

# 4. Regenerate recovery codes for all shops
# (Use admin API or direct database operations)
```

### **Webhook Secret Rotation**

**Telegram Webhook Secret**:
```bash
# 1. Generate new secret
NEW_SECRET=$(node -e "console.log(crypto.randomBytes(16).toString('hex'))")

# 2. Update environment
export TELEGRAM_WEBHOOK_SECRET=$NEW_SECRET

# 3. Update webhook registration
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "'$WEBHOOK_URL'",
    "secret_token": "'$NEW_SECRET'"
  }'

# 4. Restart application
pm2 restart chartshop-backend
```

**WhatsApp App Secret**:
```bash
# 1. Update secret in Meta Developer Console
# 2. Update environment variable
export WHATSAPP_APP_SECRET=<new-secret-from-meta>

# 3. Restart application
pm2 restart chartshop-backend
```

### **Session Secret Rotation**

**⚠️ WARNING**: Rotating session secret invalidates all active sessions.

```bash
# 1. Generate new secret  
NEW_SESSION_SECRET=$(node -e "console.log(crypto.randomBytes(32).toString('hex'))")

# 2. Update environment
export SESSION_SECRET=$NEW_SESSION_SECRET

# 3. Clear existing sessions (optional, they'll expire naturally)
# MongoDB: db.authsessions.deleteMany({})

# 4. Restart application
pm2 restart chartshop-backend
```

---

## 🚨 **Security Incident Response**

### **Suspected Account Compromise**

1. **Immediate Actions**:
   ```bash
   # Revoke all sessions for affected shop
   curl -X POST "https://your-api.com/api/v1/auth/sessions/revoke" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"revokeAll": true}'
   
   # Force PIN reset via recovery codes
   # (User must use recovery codes to set new PIN)
   ```

2. **Investigation**:
   - Check rate limiting logs for brute force attempts
   - Review session anomaly detection results  
   - Examine webhook signature verification failures
   - Analyze authentication failure patterns

### **Suspected Webhook Compromise**

1. **Immediate Actions**:
   ```bash
   # Rotate webhook secrets immediately
   # Follow webhook secret rotation procedure above
   
   # Temporarily disable webhooks if needed
   export WHATSAPP_ENABLED=false
   pm2 restart chartshop-backend
   ```

2. **Verification**:
   - Check webhook signature verification logs
   - Verify Meta Developer Console settings
   - Confirm webhook URL endpoints

### **Rate Limiting Bypass Attempts**

1. **Monitor logs** for:
   - Multiple 429 responses from same IP
   - Distributed attacks from multiple IPs
   - Unusual authentication patterns

2. **Response**:
   - Consider temporary IP blocking at infrastructure level
   - Adjust rate limiting thresholds if needed
   - Monitor for distributed attack patterns

---

## 📊 **Security Monitoring**

### **Key Metrics to Monitor**

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| **Failed login rate** | >100/hour | Check for brute force |
| **Rate limit violations** | >50/hour from single IP | Consider IP blocking |
| **Webhook signature failures** | >10/hour | Investigate webhook security |
| **Session anomalies** | >5 high-risk/day | Review session patterns |
| **Recovery code usage** | >3/day | Monitor account compromise |

### **Log Patterns to Watch**

```bash
# Rate limiting activations
grep "Rate limit exceeded" /var/log/chartshop.log

# Authentication failures
grep "Authentication failed" /var/log/chartshop.log

# Webhook signature failures  
grep "signature verification failed" /var/log/chartshop.log

# CORS violations
grep "CORS policy violation" /var/log/chartshop.log

# Security events
grep "SECURITY:" /var/log/chartshop.log
```

---

## 🔧 **Security Testing**

### **Regular Security Checks**

```bash
# 1. Test rate limiting
for i in {1..60}; do
  curl -X POST "https://your-api.com/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","pin":"wrong"}'
done

# 2. Test CORS configuration  
curl -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization" \
  -X OPTIONS "https://your-api.com/api/v1/auth/login"

# 3. Test webhook signature verification
curl -X POST "https://your-api.com/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"test": "payload"}' \
  # Should return 401 without valid signature
```

### **Security Audit Checklist**

- [ ] All production secrets are unique and properly configured
- [ ] CORS_ORIGIN is set to specific domain (not `*`)
- [ ] WhatsApp webhook signature verification is enabled
- [ ] Rate limiting is functioning on all auth endpoints
- [ ] Account lockout triggers after 5 failed attempts
- [ ] Sessions are revoked on PIN changes
- [ ] Recovery codes are shop-scoped and properly hashed
- [ ] All webhook endpoints verify signatures
- [ ] Security monitoring is operational

---

## 📋 **Deployment Security Checklist**

### **Pre-Deployment**

- [ ] Generate all required secrets with proper entropy
- [ ] Set `NODE_ENV=production`  
- [ ] Configure `CORS_ORIGIN` to specific frontend domain
- [ ] Set up webhook secrets and verify signature checking
- [ ] Test rate limiting configuration
- [ ] Verify MongoDB connection uses authentication
- [ ] Confirm HTTPS is enforced for all endpoints

### **Post-Deployment** 

- [ ] Test authentication flow end-to-end
- [ ] Verify rate limiting blocks excessive requests
- [ ] Confirm CORS blocks unauthorized origins  
- [ ] Test webhook signature verification
- [ ] Verify session management functionality
- [ ] Check security monitoring and alerting
- [ ] Validate backup and recovery procedures

---

**For additional security questions or incident response, refer to the ChartShop security team or create an issue in the repository.**
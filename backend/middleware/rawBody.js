/**
 * Raw Body Middleware for Webhook Signature Verification
 * 
 * Captures the raw request body before JSON parsing for cryptographic
 * signature verification (WhatsApp, GitHub, etc.)
 */

/**
 * Middleware to capture raw body for webhook signature verification
 */
export function captureRawBody(options = {}) {
  const { 
    limit = '10mb',
    paths = ['/webhook/whatsapp', '/webhook/github'] 
  } = options;

  return (req, res, next) => {
    // Only capture raw body for webhook paths
    const needsRawBody = paths.some(path => req.path.startsWith(path));
    
    if (!needsRawBody) {
      return next();
    }

    // Skip if already processed
    if (req.rawBody !== undefined) {
      return next();
    }

    const chunks = [];
    let totalLength = 0;
    const maxLength = parseSize(limit);

    req.on('data', (chunk) => {
      totalLength += chunk.length;
      
      if (totalLength > maxLength) {
        const error = new Error('Request body too large');
        error.status = 413;
        return next(error);
      }
      
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        req.rawBody = Buffer.concat(chunks);
        next();
      } catch (error) {
        next(error);
      }
    });

    req.on('error', (error) => {
      next(error);
    });
  };
}

/**
 * Parse size string to bytes (e.g., "10mb" -> 10485760)
 */
function parseSize(size) {
  if (typeof size === 'number') return size;
  
  const match = size.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
  if (!match) return 1024 * 1024; // Default 1MB
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  
  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  return Math.floor(value * multipliers[unit]);
}

export default captureRawBody;
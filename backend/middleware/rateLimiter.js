/**
 * Simple in-memory rate limiter middleware
 * No external dependencies needed
 */

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.resetTime > 0) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 min)
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {string} options.message - Error message when rate limited
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100,
        message = 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.'
    } = options;

    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();

        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }

        const clientData = rateLimitStore.get(key);

        // Reset if window has expired
        if (now > clientData.resetTime) {
            clientData.count = 1;
            clientData.resetTime = now + windowMs;
            return next();
        }

        clientData.count++;

        if (clientData.count > max) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message,
                retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
            });
        }

        next();
    };
};

// Pre-configured rate limiters
const generalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});

const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Stricter for auth endpoints
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
});

module.exports = { createRateLimiter, generalLimiter, authLimiter };

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter middleware for POST /api/shorten.
 * Restricts requests to 20 per 15 minutes per IP.
 */
export const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Limit each IP to 20 shorten requests per windowMs
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

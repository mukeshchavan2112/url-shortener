import { Router } from 'express';
import {
  shortenUrl,
  redirectUrl,
  getHealth,
  getUrlStats,
  getRecentLinks,
} from '../controllers/urlController.js';
import { shortenLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Health check endpoint
router.get('/health', getHealth);

// API routes (registered before /:code redirect route to prevent shadowing)
router.post('/api/shorten', shortenLimiter, shortenUrl);
router.get('/api/stats/:code', getUrlStats);
router.get('/api/links', getRecentLinks);

// Redirect endpoint: constrained to alphanumeric characters and hyphens so assets like favicon.ico aren't treated as short codes
router.get('/:code([0-9a-zA-Z-]+)', redirectUrl);

export default router;

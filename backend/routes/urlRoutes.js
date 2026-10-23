import { Router } from 'express';
import {
  shortenUrl,
  redirectUrl,
  getHealth,
} from '../controllers/urlController.js';
import { shortenLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Health check endpoint
router.get('/health', getHealth);

// Shorten URL endpoint (rate limited: 20 requests per 15 min per IP)
router.post('/api/shorten', shortenLimiter, shortenUrl);

// Redirect endpoint: constrained to alphanumeric characters and hyphens so assets like favicon.ico aren't treated as short codes
router.get('/:code([0-9a-zA-Z-]+)', redirectUrl);

export default router;

import { Router } from 'express';
import {
  shortenUrl,
  redirectUrl,
  getHealth,
} from '../controllers/urlController.js';

const router = Router();

// Health check endpoint
router.get('/health', getHealth);

// Shorten URL endpoint
router.post('/api/shorten', shortenUrl);

// Redirect endpoint: constrained to alphanumeric characters so assets like favicon.ico aren't treated as short codes
router.get('/:code([0-9a-zA-Z]+)', redirectUrl);

export default router;

import Url from '../models/Url.js';
import Counter from '../models/Counter.js';
import { encode } from '../utils/base62.js';

/**
 * Validates whether an input string is a valid HTTP or HTTPS URL.
 * Uses the native URL constructor for RFC compliance.
 *
 * @param {string} urlString
 * @returns {boolean}
 */
function isValidHttpUrl(urlString) {
  if (typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/shorten
 * Body: { longUrl, expiresAt? }
 * Validates URL, increments atomic counter, encodes into Base62, and returns short URL.
 */
export async function shortenUrl(req, res, next) {
  try {
    const { longUrl, expiresAt } = req.body;

    if (!longUrl || !isValidHttpUrl(longUrl)) {
      return res.status(400).json({
        error: 'Please provide a valid http or https URL.',
      });
    }

    // Edge case: Restrict excessively long URLs to prevent database bloating / DoS
    if (longUrl.length > 2048) {
      return res.status(400).json({
        error: 'URL exceeds maximum allowed length of 2048 characters.',
      });
    }

    // Security edge case: Prevent self-referential redirect loops
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const parsedLongUrl = new URL(longUrl);
    const parsedBaseUrl = new URL(baseUrl);
    if (parsedLongUrl.host === parsedBaseUrl.host) {
      return res.status(400).json({
        error: 'Shortening URLs that point to this service is not permitted.',
      });
    }

    // Validation for optional expiration date
    let expirationDate = null;
    if (expiresAt) {
      const parsedDate = new Date(expiresAt);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid expiresAt date format. Provide a valid ISO date string.',
        });
      }
      if (parsedDate <= new Date()) {
        return res.status(400).json({
          error: 'expiresAt must be a future date.',
        });
      }
      expirationDate = parsedDate;
    }

    // Atomically increment the sequence counter.
    // If not existing, it will be upserted (starts from 100000 via db seed).
    const counterDoc = await Counter.findOneAndUpdate(
      { _id: 'url' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    // Encode sequence integer into Base62 string (e.g., 100001 -> "q0X")
    const code = encode(counterDoc.seq);

    // Save mapping to database
    await Url.create({
      code,
      longUrl,
      expiresAt: expirationDate,
    });

    const shortUrl = `${baseUrl}/${code}`;

    return res.status(201).json({
      shortUrl,
      code,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /:code
 * Looks up the code, increments clicks, and performs a 302 redirect to the destination URL.
 */
export async function redirectUrl(req, res, next) {
  try {
    const { code } = req.params;

    const urlRecord = await Url.findOne({ code });

    if (!urlRecord) {
      return res.status(404).json({
        error: 'Short URL not found',
      });
    }

    // Check optional expiration date
    if (urlRecord.expiresAt && new Date(urlRecord.expiresAt) < new Date()) {
      return res.status(404).json({
        error: 'Short URL has expired',
      });
    }

    // Increment click count (non-blocking for performance, but handled reliably)
    await Url.updateOne({ _id: urlRecord._id }, { $inc: { clicks: 1 } });

    // 302 Found: Temporary redirect allows subsequent visits to be tracked by our server
    return res.redirect(302, urlRecord.longUrl);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /health
 * Simple health check endpoint for monitoring uptime and deployment readiness.
 */
export function getHealth(req, res) {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
  });
}

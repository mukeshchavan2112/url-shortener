import Url from '../models/Url.js';
import Counter from '../models/Counter.js';
import Click from '../models/Click.js';
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

const RESERVED_WORDS = new Set(['api', 'health', 'admin', 'stats', 'links']);

/**
 * POST /api/shorten
 * Body: { longUrl, expiresAt?, alias? }
 * Validates URL, handles custom alias or increments atomic counter, encodes into Base62, and returns short URL.
 */
export async function shortenUrl(req, res, next) {
  try {
    const { longUrl, expiresAt, alias } = req.body;

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
    const rawBaseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const parsedLongUrl = new URL(longUrl);
    const parsedBaseUrl = new URL(baseUrl);
    const loopbacks = new Set(['localhost', '127.0.0.1', '::1']);

    if (
      parsedLongUrl.host === parsedBaseUrl.host ||
      parsedLongUrl.hostname === parsedBaseUrl.hostname ||
      (loopbacks.has(parsedLongUrl.hostname) && loopbacks.has(parsedBaseUrl.hostname))
    ) {
      return res.status(400).json({
        error: 'Shortening URLs that point to this service is not permitted.',
      });
    }

    // Validation for optional expiration date
    let expirationDate = null;
    if (
      expiresAt !== undefined &&
      expiresAt !== null &&
      !(typeof expiresAt === 'string' && expiresAt.trim() === '')
    ) {
      // Reject non-date types such as booleans (new Date(false) evaluates to 1970)
      if (typeof expiresAt === 'boolean') {
        return res.status(400).json({
          error: 'Invalid expiresAt date format. Provide a valid ISO date string.',
        });
      }

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

    let code;

    const isCustomAlias =
      alias !== undefined &&
      alias !== null &&
      !(typeof alias === 'string' && alias.trim() === '');

    if (isCustomAlias) {
      // 3-20 characters, letters/numbers/hyphen only, case-sensitive
      if (typeof alias !== 'string' || !/^[0-9a-zA-Z-]{3,20}$/.test(alias)) {
        return res.status(400).json({
          error: 'Alias must be 3-20 characters long and contain only letters, numbers, and hyphens.',
        });
      }

      // Check reserved words (case-insensitive)
      if (RESERVED_WORDS.has(alias.toLowerCase())) {
        return res.status(400).json({
          error: `The alias '${alias}' is a reserved word and cannot be used.`,
        });
      }

      code = alias;

      // Save mapping to database, catching E11000 duplicate key error to safely handle race conditions
      try {
        await Url.create({
          code,
          longUrl,
          expiresAt: expirationDate,
        });
      } catch (err) {
        if (err.code === 11000) {
          return res.status(409).json({
            error: 'Alias is already in use.',
          });
        }
        throw err;
      }
    } else {
      // Collision retry for generated codes: loop up to 5 attempts
      let created = false;
      for (let attempt = 1; attempt <= 5; attempt++) {
        const counterDoc = await Counter.findOneAndUpdate(
          { _id: 'url' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );

        code = encode(counterDoc.seq);

        try {
          await Url.create({
            code,
            longUrl,
            expiresAt: expirationDate,
          });
          created = true;
          break;
        } catch (err) {
          if (err.code === 11000) {
            continue;
          }
          throw err;
        }
      }

      if (!created) {
        return res.status(500).json({
          error: 'Could not generate a unique code. Please try again.',
        });
      }
    }

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

    // Check optional expiration date (returns 410 Gone if expired)
    if (urlRecord.expiresAt && new Date(urlRecord.expiresAt) <= new Date()) {
      return res.status(410).json({
        error: 'Short URL has expired',
      });
    }

    // Fire-and-forget click increment with .catch logging so counter failures never block redirects
    Url.updateOne({ _id: urlRecord._id }, { $inc: { clicks: 1 } }).catch((err) => {
      console.error('Failed to increment clicks:', err);
    });

    // Fire-and-forget click logging with .catch so click logging failures never delay or break the redirect
    const referrer = (req.get('Referer') || '').slice(0, 500);
    const userAgent = (req.get('User-Agent') || '').slice(0, 500);
    Click.create({
      code: urlRecord.code,
      referrer,
      userAgent,
    }).catch((err) => {
      console.error('Failed to log click:', err);
    });

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

/**
 * GET /api/stats/:code
 * Returns click statistics and metadata for a given short code.
 * Responds with { code, longUrl, createdAt, expiresAt, totalClicks, recentClicks }.
 * recentClicks contains the last 20 Click entries (ts, referrer, userAgent) ordered newest first.
 */
export async function getUrlStats(req, res, next) {
  try {
    const { code } = req.params;

    const urlRecord = await Url.findOne({ code });

    if (!urlRecord) {
      return res.status(404).json({
        error: 'Short URL not found',
      });
    }

    const recentClicks = await Click.find({ code })
      .sort({ ts: -1 })
      .limit(20)
      .select('ts referrer userAgent -_id')
      .lean();

    return res.status(200).json({
      code: urlRecord.code,
      longUrl: urlRecord.longUrl,
      createdAt: urlRecord.createdAt,
      expiresAt: urlRecord.expiresAt,
      totalClicks: urlRecord.clicks,
      recentClicks,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/links
 * Returns the 50 most recent links (code, longUrl, shortUrl, clicks, createdAt, expiresAt), newest first.
 * shortUrl is built from BASE_URL.
 */
export async function getRecentLinks(req, res, next) {
  try {
    const rawBaseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');

    const urlRecords = await Url.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const links = urlRecords.map((url) => ({
      code: url.code,
      longUrl: url.longUrl,
      shortUrl: `${baseUrl}/${url.code}`,
      clicks: url.clicks,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
    }));

    return res.status(200).json(links);
  } catch (error) {
    next(error);
  }
}

# URL Shortener

A full-stack MERN URL shortener with custom aliases, link expiry, and click analytics.

- **Live demo:** https://url-shortener-five-lac.vercel.app
- **API:** https://url-shortener-2fzj.onrender.com

> Hosted on Render's free tier. The first request after a period of inactivity can take about a minute while the server wakes up.

## Features

- Shorten any `http`/`https` URL into a short code (base62, generated from an atomic counter)
- Optional custom alias (3-20 characters: letters, digits, hyphens) with reserved words blocked
- Optional expiry date; expired links return `410 Gone`
- Click tracking (timestamp, referrer, user agent) without slowing down the redirect
- Stats page per link: total clicks and the 20 most recent clicks
- Links page listing the 50 most recent links
- Per-IP rate limiting on link creation (20 requests per 15 minutes)

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, react-router-dom, axios, plain CSS |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB (Atlas) |
| Hosting | Vercel (frontend), Render (backend) |

## Architecture

```
Browser (React on Vercel)
        |  axios -> /api/shorten, /api/links, /api/stats/:code
        v
Express API (Render) ---- Mongoose ----> MongoDB Atlas
        ^                                  - urls
        |  GET /:code  -> 302 redirect     - clicks
Anyone with a short link                   - counters
```

Creating a link calls `POST /api/shorten`. Visiting a short link hits `GET /:code` on the API, which looks up the code, records a click in the background, and responds with a 302 redirect to the original URL.

## Data Model

**Url**

| Field | Type | Notes |
|---|---|---|
| `code` | String | Required, unique index |
| `longUrl` | String | Required |
| `createdAt` | Date | Default: now |
| `expiresAt` | Date | Default: null. TTL index with `expireAfterSeconds: 0` |
| `clicks` | Number | Default 0, incremented with `$inc` |

**Click**

| Field | Type | Notes |
|---|---|---|
| `code` | String | Required |
| `ts` | Date | Default: now |
| `referrer` | String | Truncated to 500 characters |
| `userAgent` | String | Truncated to 500 characters |

Compound index on `{ code: 1, ts: -1 }` for fast "latest clicks for a code" queries.

**Counter**

| Field | Type | Notes |
|---|---|---|
| `_id` | String | Single document, `_id: 'url'` |
| `seq` | Number | Seeded at 100000, incremented atomically per new link |

## API

| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| `POST` | `/api/shorten` | Create a short link. Body: `longUrl` (required), `alias` (optional), `expiresAt` (optional ISO date, must be in the future) | `201` `{ shortUrl, code }` | `400` invalid URL/alias/date, `409` alias taken, `429` rate limited |
| `GET` | `/:code` | Redirect to the original URL and log a click | `302` | `404` not found, `410` expired |
| `GET` | `/api/stats/:code` | Total clicks and the 20 most recent clicks | `200` | `404` |
| `GET` | `/api/links` | The 50 most recent links with click counts | `200` | |
| `GET` | `/health` | Health check: `{ status, uptime }` | `200` | |

Example:

```bash
curl -X POST https://url-shortener-2fzj.onrender.com/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://example.com","alias":"my-link"}'
```

## Local Setup

Requirements: Node.js 18+ and a MongoDB connection string (Atlas free tier works).

**Backend**

```bash
cd backend
npm install
```

Create `backend/.env`:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/urlshortener?retryWrites=true&w=majority
PORT=5000
BASE_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

**Frontend**

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

```bash
npm run dev
```

Open http://localhost:5173.

## Design Decisions

**Atomic counter + base62 instead of hashing.** Each new link takes the next number from a counter using a single `findOneAndUpdate` with `$inc`, then encodes it in base62. This makes collisions impossible by construction, even with concurrent requests, and codes stay short. A hash of the URL would need collision checks and retries, and truncating it to a short length makes collisions likely. I tested this by firing concurrent create requests and checking that every code was unique. The trade-off is that codes are sequential and therefore guessable, which is fine for public links but not for private ones.

**Custom aliases share the same namespace.** Aliases are enforced by the unique index on `code`. Instead of checking first and inserting second (which has a race), the insert is attempted and the duplicate-key error is turned into a `409`. I also tested a same-alias race. If a generated code happens to collide with an existing alias, the server takes the next counter value and retries.

**302 instead of 301.** A 301 is cached by browsers, so repeat visits would skip the server and clicks would never be counted. A 302 sends every visit through the API, which keeps analytics accurate and lets expiry take effect immediately. The cost is more traffic to the server.

**TTL index plus a check in the handler.** The TTL index lets MongoDB delete expired links automatically, but its background job only runs about once a minute, so an expired link can still exist for a short while. The redirect handler therefore checks `expiresAt` itself and returns `410 Gone` right away. Once MongoDB has deleted the document, the same code returns `404`.

**Clicks in their own collection.** Click events are stored separately from links so the `urls` documents stay small and click history can grow without bloating them. Each link also keeps a `clicks` counter for cheap totals on the Links page, while the Stats page reads the latest events from the `clicks` collection. Click logging is fire-and-forget, so the redirect does not wait for the database write.

## What I'd Improve

- **Redis cache** for code-to-URL lookups, so most redirects skip MongoDB
- **Authentication and per-user links**, so users can manage and delete their own links
- **Redis-backed rate limiting**, so limits are shared across multiple server instances instead of per process
- **TTL on the clicks collection**, so click history does not grow forever, and cleanup of clicks that belong to deleted links
- **Non-sequential codes**, if link privacy ever matters
- **Automated tests** for the API (currently verified with manual and script-based checks)
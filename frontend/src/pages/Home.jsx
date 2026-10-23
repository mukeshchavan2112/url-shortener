import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { shortenUrl, getErrorMessage } from '../api.js';

export default function Home() {
  const [longUrl, setLongUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setCopied(false);

    if (!longUrl.trim()) {
      setError('Please enter a destination URL.');
      return;
    }

    // Build payload without empty strings
    const payload = {
      longUrl: longUrl.trim(),
    };

    if (alias && alias.trim()) {
      payload.alias = alias.trim();
    }

    if (expiresAt && expiresAt.trim()) {
      payload.expiresAt = new Date(expiresAt).toISOString();
    }

    setLoading(true);
    try {
      const data = await shortenUrl(payload);
      setResult(data);
      // Reset optional fields on success
      setAlias('');
      setExpiresAt('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.shortUrl) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="page-content">
      <div className="card">
        <h1 className="page-title">Shorten a URL</h1>
        <p className="page-subtitle">
          Create clean, trackable short links with custom aliases and expiration dates.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-group">
            <label htmlFor="longUrl" className="form-label">
              Destination URL <span className="required">*</span>
            </label>
            <input
              id="longUrl"
              type="url"
              className="form-input"
              placeholder="https://example.com/my-long-link-to-shorten"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="alias" className="form-label">
                Custom alias <span className="optional">(optional)</span>
              </label>
              <input
                id="alias"
                type="text"
                className="form-input"
                placeholder="e.g. launch-2026"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="expiresAt" className="form-label">
                Expiration date <span className="optional">(optional)</span>
              </label>
              <input
                id="expiresAt"
                type="datetime-local"
                className="form-input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Shortening...' : 'Shorten URL'}
          </button>
        </form>

        {result && (
          <div className="result-card">
            <h2 className="result-title">Your Short Link is Ready!</h2>
            <div className="result-row">
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="result-link"
              >
                {result.shortUrl}
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-secondary btn-sm"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="result-actions">
              <Link to={`/stats/${result.code}`} className="stats-link">
                View link statistics &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

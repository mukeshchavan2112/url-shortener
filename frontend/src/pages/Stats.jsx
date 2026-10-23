import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStats, getErrorMessage } from '../api.js';

export default function Stats() {
  const { code } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const data = await getStats(code);
        if (isMounted) {
          setStats(data);
        }
      } catch (err) {
        if (isMounted) {
          if (err.response && err.response.status === 404) {
            setNotFound(true);
          } else {
            setError(getErrorMessage(err));
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (code) {
      fetchStats();
    }

    return () => {
      isMounted = false;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="card">
          <div className="state-message">Loading statistics...</div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-content">
        <div className="card text-center">
          <h1 className="page-title">Link not found</h1>
          <p className="page-subtitle">
            The short code <span className="code-badge">{code}</span> does not exist or has expired.
          </p>
          <div className="button-group-center">
            <Link to="/" className="btn btn-primary">
              Shorten a new URL
            </Link>
            <Link to="/links" className="btn btn-secondary">
              View all links
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="card">
          <div className="alert alert-error">{error}</div>
          <Link to="/links" className="btn btn-secondary btn-sm">
            &larr; Back to recent links
          </Link>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const shortUrl = `${baseUrl}/${stats.code}`;

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header-flex">
          <div>
            <h1 className="page-title">Link Statistics</h1>
            <p className="page-subtitle">
              Analytics and telemetry for short code <span className="code-badge">{stats.code}</span>
            </p>
          </div>
          <Link to="/links" className="btn btn-secondary btn-sm">
            &larr; Back to recent links
          </Link>
        </div>

        <div className="stats-summary-grid">
          <div className="stat-card">
            <div className="stat-label">Total Clicks</div>
            <div className="stat-value">{stats.totalClicks}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Short URL</div>
            <div className="stat-value-text">
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="stat-link"
              >
                {shortUrl}
              </a>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Created</div>
            <div className="stat-value-sub">
              {new Date(stats.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Expiry</div>
            <div className="stat-value-sub">
              {stats.expiresAt
                ? new Date(stats.expiresAt).toLocaleString()
                : 'Never'}
            </div>
          </div>
        </div>

        <div className="original-url-box">
          <span className="url-label">Original URL:</span>
          <a
            href={stats.longUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="original-link"
            title={stats.longUrl}
          >
            {stats.longUrl}
          </a>
        </div>

        <div className="recent-clicks-section">
          <h2 className="section-title">Recent clicks (last 20)</h2>

          {!stats.recentClicks || stats.recentClicks.length === 0 ? (
            <div className="empty-state">
              <p>No clicks recorded yet. Share your short link to start tracking visits!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Referrer</th>
                    <th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentClicks.map((click, index) => (
                    <tr key={index}>
                      <td className="cell-date">
                        {new Date(click.ts).toLocaleString()}
                      </td>
                      <td>
                        {click.referrer ? (
                          <span className="truncate-text" title={click.referrer}>
                            {click.referrer}
                          </span>
                        ) : (
                          <span className="direct-badge">Direct</span>
                        )}
                      </td>
                      <td className="cell-truncate">
                        <span
                          className="truncate-text"
                          title={click.userAgent || 'Unknown'}
                        >
                          {click.userAgent || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

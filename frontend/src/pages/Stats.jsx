import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStats, getErrorMessage } from '../api.js';

export default function Stats() {
  const { code } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const [prevCode, setPrevCode] = useState(code);
  if (prevCode !== code) {
    setPrevCode(code);
    setStats(null);
    setLoading(true);
    setNotFound(false);
    setError('');
  }

  const loadStats = useCallback(async () => {
    if (!code) return;
    const reqId = ++requestIdRef.current;

    try {
      const data = await getStats(code);
      if (reqId === requestIdRef.current) {
        setStats(data);
        setError('');
        setNotFound(false);
      }
    } catch (err) {
      if (reqId === requestIdRef.current) {
        if (err.response && err.response.status === 404) {
          setNotFound(true);
        } else {
          setError((prev) => (statsRef.current ? prev : getErrorMessage(err)));
        }
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [code]);

  useEffect(() => {
    let intervalId = null;

    queueMicrotask(() => {
      loadStats();
    });

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            loadStats();
          }
        }, 5000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadStats();
        startPolling();
      } else {
        stopPolling();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadStats();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [code, loadStats]);

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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={loadStats}
              className="btn btn-secondary btn-sm"
            >
              Refresh
            </button>
            <Link to="/links" className="btn btn-secondary btn-sm">
              &larr; Back to recent links
            </Link>
          </div>
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

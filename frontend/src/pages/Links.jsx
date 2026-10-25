import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getLinks, getErrorMessage } from '../api.js';

export default function Links() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const loadLinks = useCallback(async () => {
    const reqId = ++requestIdRef.current;

    try {
      const data = await getLinks();
      if (reqId === requestIdRef.current) {
        setLinks(data);
        hasLoadedRef.current = true;
        setError('');
      }
    } catch (err) {
      if (reqId === requestIdRef.current) {
        if (!hasLoadedRef.current) {
          setError(getErrorMessage(err));
        }
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let intervalId = null;

    queueMicrotask(() => {
      loadLinks();
    });

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            loadLinks();
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
        loadLinks();
        startPolling();
      } else {
        stopPolling();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadLinks();
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
  }, [loadLinks]);

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header-flex">
          <div>
            <h1 className="page-title">Recent links</h1>
            <p className="page-subtitle">
              Showing the 50 most recently created shortened URLs.
            </p>
          </div>
          <button
            type="button"
            onClick={loadLinks}
            className="btn btn-secondary btn-sm"
          >
            Refresh
          </button>
        </div>

        {loading && <div className="state-message">Loading links...</div>}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && links.length === 0 && (
          <div className="empty-state">
            <p>No links found yet.</p>
            <Link to="/" className="btn btn-primary btn-sm">
              Create your first link
            </Link>
          </div>
        )}

        {!loading && links.length > 0 && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Short code</th>
                  <th>Original URL</th>
                  <th>Clicks</th>
                  <th>Created date</th>
                  <th>Expiry</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.code}>
                    <td>
                      <a
                        href={link.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-link"
                      >
                        {link.code}
                      </a>
                    </td>
                    <td className="cell-truncate">
                      <span className="truncate-text" title={link.longUrl}>
                        {link.longUrl}
                      </span>
                    </td>
                    <td className="cell-number">{link.clicks}</td>
                    <td className="cell-date">
                      {new Date(link.createdAt).toLocaleString()}
                    </td>
                    <td className="cell-date">
                      {link.expiresAt
                        ? new Date(link.expiresAt).toLocaleString()
                        : 'Never'}
                    </td>
                    <td>
                      <Link
                        to={`/stats/${link.code}`}
                        className="btn btn-secondary btn-xs"
                      >
                        Stats
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

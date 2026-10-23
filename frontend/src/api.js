import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Shorten a long URL.
 * @param {Object} data - { longUrl, alias?, expiresAt? }
 * @returns {Promise<{ shortUrl: string, code: string }>}
 */
export async function shortenUrl(data) {
  const response = await api.post('/api/shorten', data);
  return response.data;
}

/**
 * Fetch the 50 most recent links.
 * @returns {Promise<Array<{ code, longUrl, shortUrl, clicks, createdAt, expiresAt }>>}
 */
export async function getLinks() {
  const response = await api.get('/api/links');
  return response.data;
}

/**
 * Fetch statistics for a specific short code.
 * @param {string} code
 * @returns {Promise<{ code, longUrl, createdAt, expiresAt, totalClicks, recentClicks }>}
 */
export async function getStats(code) {
  const response = await api.get(`/api/stats/${code}`);
  return response.data;
}

/**
 * Extracts a user-friendly error message from Axios errors.
 * Handles 400, 409, 429, 404, and network connection failures.
 */
export function getErrorMessage(error) {
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error;
  }
  if (error.request) {
    return 'Unable to connect to the server. Please check your connection and ensure the backend is running.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

export default api;

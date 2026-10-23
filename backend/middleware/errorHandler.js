/**
 * Centralized error-handling middleware.
 * Catches unhandled errors across all routes and returns a structured JSON error response.
 */
export function errorHandler(err, req, res, next) {
  // Log full error stack in development for debugging
  console.error('Unhandled Server Error:', err);

  const statusCode = err.statusCode || err.status || (res.statusCode >= 400 ? res.statusCode : 500);

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
}

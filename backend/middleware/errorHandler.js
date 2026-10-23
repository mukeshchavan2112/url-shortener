/**
 * Centralized error-handling middleware.
 * Catches unhandled errors across all routes and returns a structured JSON error response.
 */
export function errorHandler(err, req, res, next) {
  // Log full error stack in development for debugging
  console.error('Unhandled Server Error:', err);

  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Conflict: A resource with that identifier already exists.',
    });
  }

  const statusCode = err.statusCode || err.status || (res.statusCode >= 400 ? res.statusCode : 500);

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
}

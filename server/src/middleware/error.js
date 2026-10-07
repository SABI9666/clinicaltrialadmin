import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

/* eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity. */
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large' });
  }

  const status = err.status ?? 500;
  if (status >= 500) console.error(err);

  // 5xx messages are masked by default so an internal failure cannot leak
  // stack details or connection strings. `expose` opts a specific error out:
  // it marks a message written deliberately for the person to read, such as
  // "your registration could not be sent".
  const safe = status < 500 || err?.expose === true;
  res.status(status).json({
    error: safe ? err.message : 'Internal server error',
  });
}

/** Wrap an async handler so rejected promises reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

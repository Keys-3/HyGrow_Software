export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : error.status || 500;
  const message = status >= 500 ? 'Service unavailable. Please try again later.' : error.type === 'entity.parse.failed' ? 'Invalid JSON body.' : error.message;
  if (status >= 500 && !(error instanceof HttpError)) console.error('Request failed:', error.name || 'Error');
  res.status(status).json({ success: false, message, error: message });
}

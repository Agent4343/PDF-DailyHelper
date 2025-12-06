const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  const start = process.hrtime.bigint();

  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.session?.userId,
  });

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(3)),
      userId: req.session?.userId,
    });
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs) / 1_000_000;
      logger.warn('Request aborted by client', {
        requestId,
        method: req.method,
        path: req.originalUrl,
        durationMs: Number(durationMs.toFixed(3)),
        userId: req.session?.userId,
      });
    }
  });

  next();
}

module.exports = requestLogger;

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'body.password'],
  base: { env: process.env.NODE_ENV || 'development' }
});

module.exports = logger;

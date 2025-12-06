function normalizeMeta(meta = {}) {
  if (!meta || typeof meta !== 'object') {
    return undefined;
  }

  const sanitized = {};
  Object.entries(meta).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (value instanceof Error) {
      sanitized[key] = {
        message: value.message,
        stack: value.stack,
      };
      return;
    }
    if (typeof value === 'object' && value !== null) {
      try {
        sanitized[key] = JSON.parse(JSON.stringify(value));
      } catch (error) {
        sanitized[key] = value.toString();
      }
      return;
    }
    sanitized[key] = value;
  });

  return Object.keys(sanitized).length ? sanitized : undefined;
}

function log(level, message, meta) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  const normalizedMeta = normalizeMeta(meta);
  if (normalizedMeta) {
    payload.meta = normalizedMeta;
  }

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

module.exports = {
  info(message, meta) {
    log('info', message, meta);
  },
  warn(message, meta) {
    log('warn', message, meta);
  },
  error(message, meta) {
    log('error', message, meta);
  },
};

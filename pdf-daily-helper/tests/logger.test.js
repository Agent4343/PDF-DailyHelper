const logger = require('../services/logger');

describe('logger', () => {
  test('exposes standard logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});

const { isAuthenticated } = require('../routes/middleware/authMiddleware');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

describe('isAuthenticated middleware', () => {
  test('allows request when user is authenticated', () => {
    const req = { session: { userId: 'user-123' } };
    const res = createResponse();
    const next = jest.fn();

    isAuthenticated(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 JSON for API callers', () => {
    const req = {
      session: {},
      originalUrl: '/api/search',
      xhr: true,
      headers: { accept: 'application/json' }
    };
    const res = createResponse();
    const next = jest.fn();

    isAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('redirects to login for HTML callers', () => {
    const req = {
      session: {},
      originalUrl: '/search',
      headers: { accept: 'text/html' }
    };
    const res = createResponse();
    const next = jest.fn();

    isAuthenticated(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
  });
});

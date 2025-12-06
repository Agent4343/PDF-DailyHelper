function expectsJsonResponse(req) {
  const acceptHeader = req.headers?.accept || '';
  return (
    req.xhr ||
    req.originalUrl.startsWith('/api') ||
    acceptHeader.includes('application/json')
  );
}

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  if (expectsJsonResponse(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  return res.redirect('/auth/login');
}

module.exports = { ensureAuthenticated };

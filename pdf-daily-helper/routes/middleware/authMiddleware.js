const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }

  const expectsJson =
    req.originalUrl.startsWith('/api') ||
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (expectsJson) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  return res.redirect('/auth/login');
};

module.exports = {
  isAuthenticated
};
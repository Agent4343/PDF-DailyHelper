const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const JWT_EXPIRES_IN = '7d';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.userId = decoded.userId;
    }
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.userId) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/auth/login');
  }
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware, requireAuth };

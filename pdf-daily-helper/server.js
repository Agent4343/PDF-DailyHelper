// Load environment variables
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const searchRoutes = require('./routes/searchRoutes');
const chatRoutes = require('./routes/chatRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const Pdf = require('./models/Pdf');
const { isAuthenticated } = require('./routes/middleware/authMiddleware');
const logger = require('./services/logger');
const { AVAILABLE_OCR_PROVIDERS } = require('./services/ocrService');
const { ensureOwnerAccount } = require('./services/ownerSetup');

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  throw new Error('Missing DATABASE_URL or SESSION_SECRET. Please configure your environment variables.');
}

const app = express();
const port = process.env.PORT || 3000;

app.disable('x-powered-by');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '6mb' }));

app.use(express.static(path.join(__dirname, 'public')));

let dbConnectionPromise;

async function initializeDatabase() {
  if (!dbConnectionPromise) {
    dbConnectionPromise = mongoose.connect(process.env.DATABASE_URL);
    await dbConnectionPromise;
    logger.info('Database connected successfully');
  }
  return dbConnectionPromise;
}

initializeDatabase()
  .then(() => ensureOwnerAccount())
  .catch((err) => {
  logger.error({ err }, 'Database connection error');
  throw err;
});

const sessionStore = MongoStore.create({
  mongoUrl: process.env.DATABASE_URL,
  collectionName: 'sessions'
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: Boolean(process.env.VERCEL),
      sameSite: 'lax'
    }
  })
);

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: req.session?.userId || null
    });
  });
  next();
});

const featureFlags = {
  ocrEnabled: Boolean(process.env.OCR_PROVIDER),
  ocrProvider: (process.env.OCR_PROVIDER || '').toUpperCase() || null,
  availableOcrProviders: AVAILABLE_OCR_PROVIDERS
};

app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.features = featureFlags;
  next();
});

const generalApiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.API_RATE_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }
});

const chatLimiter = rateLimit({
  windowMs: Number(process.env.CHAT_RATE_WINDOW_MS || 60 * 1000),
  max: Number(process.env.CHAT_RATE_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many chat requests. Please slow down.' });
  }
});

app.use('/api/chat', chatLimiter);
app.use('/api', generalApiLimiter);

app.use(authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', pdfRoutes);
app.use('/', searchRoutes);
app.use('/', chatRoutes);
app.use('/', ownerRoutes);

app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', async (req, res) => {
  if (!req.session?.userId) {
    return res.render('login');
  }

  try {
    const pdfs = await Pdf.find({ user: req.session.userId }).sort({ uploadDate: -1 });
    res.render('index', { pdfs });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching PDFs');
    res.status(500).send('Error fetching PDFs');
  }
});

app.use((req, res) => {
  res.status(404).send('Page not found.');
});

app.use((err, req, res, next) => {
  logger.error({ err, path: req.originalUrl }, 'Unhandled application error');
  res.status(500).send('There was an error serving your request.');
});

if (require.main === module) {
  app
    .listen(port, () => {
      logger.info({ port }, 'Server started');
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error({ port }, 'Port already in use');
        process.exit(1);
      } else {
        logger.error({ err }, 'An error occurred while starting the server');
        process.exit(1);
      }
    });
}

module.exports = app;
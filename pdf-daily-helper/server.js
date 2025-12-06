// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const cookieParser = require('cookie-parser');
const session = require("express-session");
const MongoStore = require('connect-mongo');
const csrf = require('csurf');
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require('./routes/uploadRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const searchRoutes = require('./routes/searchRoutes');
const Pdf = require('./models/Pdf');
require('./models/IndexedData');
const { ensureAuthenticated } = require('./middleware/authMiddleware');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');

logger.info('Server starting', {
  nodeVersion: process.version,
  workingDirectory: process.cwd(),
});

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  logger.error('Required environment variables are missing. Please set DATABASE_URL and SESSION_SECRET.');
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;
const csrfProtection = csrf();

app.use(cookieParser());

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

logger.info('Attempting to connect to database', {
  databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
});

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    logger.info("Database connected successfully");
  })
  .catch((err) => {
    logger.error('Database connection error', { error: err });
    process.exit(1);
  });

// Session configuration with connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
  }),
);

app.use(requestLogger);
app.use(csrfProtection);

app.on("error", (error) => {
  logger.error('Server error event emitted', { error });
});

// Logging session creation and destruction
app.use((req, res, next) => {
  const sess = req.session;
  // Make session available to all views
  res.locals.session = sess;
  if (typeof req.csrfToken === 'function') {
    try {
      res.locals.csrfToken = req.csrfToken();
    } catch (err) {
      return next(err);
    }
  }
  if (!sess.views) {
    sess.views = 1;
    logger.info('Session created', {
      requestId: req.requestId,
      createdAt: new Date().toISOString(),
      userId: sess.userId,
    });
  } else {
    sess.views++;
    logger.info('Session accessed', {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      views: sess.views,
      userId: sess.userId,
    });
  }
  next();
});

// Authentication Routes
app.use(authRoutes);

// Upload Routes - Updated route prefix for consistency
app.use('/api', uploadRoutes);

// PDF Routes - Correctly placed after other middleware and before error handlers
app.use('/api', pdfRoutes);

// Search Routes
app.use('/', searchRoutes);

// Root path response
app.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const pdfs = await Pdf.find({ user: req.session.userId }).sort({ uploadDate: -1 });
    res.render("index", { pdfs: pdfs });
  } catch (error) {
    logger.error('Error fetching PDFs for dashboard', {
      error,
      requestId: req.requestId,
      userId: req.session.userId,
    });
    res.status(500).send("Error fetching PDFs");
  }
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('Invalid CSRF token detected', {
      method: req.method,
      path: req.originalUrl,
      requestId: req.requestId,
      userId: req.session?.userId,
    });
    if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    return res.status(403).send('Invalid CSRF token');
  }
  logger.error('Unhandled application error', {
    error: err,
    requestId: req.requestId,
  });
  res.status(500).send("There was an error serving your request.");
});

logger.info('Setting up server listener', { port });

const server = app.listen(port, () => {
  logger.info('Server started', { port });
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error('Port already in use', { port });
    process.exit(1);
  } else {
    logger.error('An error occurred while starting the server', { error: err });
    process.exit(1);
  }
});
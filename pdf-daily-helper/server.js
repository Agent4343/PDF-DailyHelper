// Load environment variables
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const searchRoutes = require('./routes/searchRoutes');
const Pdf = require('./models/Pdf');
const { isAuthenticated } = require('./routes/middleware/authMiddleware');

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
    console.log('Database connected successfully');
  }
  return dbConnectionPromise;
}

initializeDatabase().catch((err) => {
  console.error(`Database connection error: ${err.message}`);
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
  res.locals.session = req.session;
  next();
});

app.use(authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', pdfRoutes);
app.use('/', searchRoutes);

app.get('/', isAuthenticated, async (req, res) => {
  try {
    const pdfs = await Pdf.find({ user: req.session.userId }).sort({ uploadDate: -1 });
    res.render('index', { pdfs });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).send('Error fetching PDFs');
  }
});

app.use((req, res) => {
  res.status(404).send('Page not found.');
});

app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  res.status(500).send('There was an error serving your request.');
});

if (require.main === module) {
  app
    .listen(port, () => {
      console.log(`Server started on port ${port}`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please choose a different port or stop the other process.`);
        process.exit(1);
      } else {
        console.error('An error occurred while starting the server:', err);
        process.exit(1);
      }
    });
}

module.exports = app;
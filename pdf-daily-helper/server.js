// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require('./routes/uploadRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const searchRoutes = require('./routes/searchRoutes');
const Pdf = require('./models/Pdf');
require('./models/IndexedData');

console.log('Server starting...');
console.log('Node version:', process.version);
console.log('Current working directory:', process.cwd());

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to log POST request bodies
app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('POST request body:', req.body);
  }
  next();
});

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

console.log('Attempting to connect to database...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
    console.error(err.stack);
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

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Logging session creation and destruction
app.use((req, res, next) => {
  const sess = req.session;
  // Make session available to all views
  res.locals.session = sess;
  if (!sess.views) {
    sess.views = 1;
    console.log("Session created at: ", new Date().toISOString());
  } else {
    sess.views++;
    console.log(
      `Session accessed again at: ${new Date().toISOString()}, Views: ${sess.views}, User ID: ${sess.userId || '(unauthenticated)'}`,
    );
  }
  next();
});

// Log for all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
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
app.get("/", async (req, res) => {
  try {
    const pdfs = await Pdf.find().sort({ uploadDate: -1 });
    res.render("index", { pdfs: pdfs });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).send("Error fetching PDFs");
  }
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

console.log('Setting up server to listen on port:', port);

const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please choose a different port or stop the other process.`);
    process.exit(1);
  } else {
    console.error('An error occurred while starting the server:', err);
    process.exit(1);
  }
});
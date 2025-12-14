// Load environment variables
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const { connectToDatabase } = require("./lib/mongodb");
const { authMiddleware } = require("./lib/auth");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require('./routes/uploadRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const searchRoutes = require('./routes/searchRoutes');
const chatRoutes = require('./routes/chatRoutes');
const gapAnalysisRoutes = require('./routes/gapAnalysisRoutes');
const Pdf = require('./models/Pdf');
require('./models/IndexedData');

console.log('Server starting...');
console.log('Node version:', process.version);

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error("Please create/edit .env configuration file.");
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Middleware to connect to database on each request (for serverless)
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).send('Database connection error');
  }
});

// JWT Authentication middleware
app.use(authMiddleware);

// Make auth state available to all views
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.userId;
  res.locals.userId = req.userId;
  next();
});

// Middleware to log requests (reduced for production)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method === 'POST') {
      console.log('POST request body:', req.body);
    }
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
  });
}

// Setting the templating engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Authentication Routes
app.use(authRoutes);

// Upload Routes
app.use('/api', uploadRoutes);

// PDF Routes
app.use('/api', pdfRoutes);

// Search Routes
app.use('/', searchRoutes);

// Chat Routes (AI Assistant)
app.use('/', chatRoutes);

// Gap Analysis Routes
app.use('/', gapAnalysisRoutes);

// PDF Viewer page
app.get("/viewer/:id", (req, res) => {
  res.render("viewer", { pdfId: req.params.id });
});

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

// Only start the server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
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
}

// Export app for Vercel serverless
module.exports = app;

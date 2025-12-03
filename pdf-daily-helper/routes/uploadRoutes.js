const express = require('express');
const router = express.Router();
const multer = require('multer');
const Pdf = require('../models/Pdf');
const { parsePdf } = require('../services/pdfParseService');
const { isAuthenticated } = require('./middleware/authMiddleware');
const logger = require('../services/logger');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed!'));
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const runUpload = (req, res, next) => {
  upload.single('pdfFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    return next();
  });
};

router.post('/upload', isAuthenticated, runUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const sanitizedName = req.file.originalname.replace(/[/\\?%*:|"<>]/g, '-');
  const filename = `${Date.now()}-${sanitizedName}`;

  try {
    const newPdf = await Pdf.create({
      filename,
      originalName: sanitizedName,
      user: req.session.userId,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileData: req.file.buffer
    });

    await parsePdf(newPdf._id, req.file.buffer);

    return res.status(200).json({ message: 'File uploaded successfully and parsing initiated.' });
  } catch (error) {
    logger.error({ err: error, userId: req.session.userId }, 'Error in upload route');
    return res.status(500).json({ message: 'Error uploading file.' });
  }
});

module.exports = router;

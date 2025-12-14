const express = require('express');
const router = express.Router();
const multer = require('multer');
const Pdf = require('../models/Pdf');
const { parsePdf } = require('../services/pdfParseService');

// Check if Vercel Blob is available
const isVercelBlobEnabled = !!process.env.BLOB_READ_WRITE_TOKEN;

// Configure multer - use memory storage for Vercel Blob, disk storage for local
const storage = isVercelBlobEnabled
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, 'uploads');
      },
      filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
      }
    });

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed!'), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

router.post('/upload', upload.single('pdfFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    let pdfData = {
      filename: Date.now() + '-' + req.file.originalname,
      originalName: req.file.originalname
      // No user tracking for privacy
    };

    // Handle auto-delete expiration
    const autoDeleteHours = parseInt(req.body.autoDelete);
    if (autoDeleteHours && autoDeleteHours > 0) {
      pdfData.expiresAt = new Date(Date.now() + autoDeleteHours * 60 * 60 * 1000);
    }

    // Upload to Vercel Blob if available, otherwise use local storage
    if (isVercelBlobEnabled) {
      const { put } = require('@vercel/blob');
      const blob = await put(pdfData.filename, req.file.buffer, {
        access: 'public',
        contentType: 'application/pdf'
      });
      pdfData.blobUrl = blob.url;
    } else {
      pdfData.path = req.file.path;
      pdfData.filename = req.file.filename;
    }

    const newPdf = new Pdf(pdfData);
    await newPdf.save();

    // Parse PDF in background
    parsePdf(newPdf._id).catch(() => {});

    res.status(200).send('File uploaded successfully.');
  } catch (error) {
    res.status(500).send('Error uploading file.');
  }
});

// Batch upload - multiple files
router.post('/upload/batch', upload.array('pdfFiles', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded.' });
  }

  const results = {
    success: [],
    failed: []
  };

  // Handle auto-delete expiration
  const autoDeleteHours = parseInt(req.body.autoDelete);
  const expiresAt = (autoDeleteHours && autoDeleteHours > 0)
    ? new Date(Date.now() + autoDeleteHours * 60 * 60 * 1000)
    : null;

  for (const file of req.files) {
    try {
      let pdfData = {
        filename: Date.now() + '-' + file.originalname,
        originalName: file.originalname
        // No user tracking for privacy
      };

      if (expiresAt) {
        pdfData.expiresAt = expiresAt;
      }

      if (isVercelBlobEnabled) {
        const { put } = require('@vercel/blob');
        const blob = await put(pdfData.filename, file.buffer, {
          access: 'public',
          contentType: 'application/pdf'
        });
        pdfData.blobUrl = blob.url;
      } else {
        pdfData.path = file.path;
        pdfData.filename = file.filename;
      }

      const newPdf = new Pdf(pdfData);
      await newPdf.save();

      // Parse PDF in background
      parsePdf(newPdf._id).catch(() => {});

      results.success.push({
        name: file.originalname,
        id: newPdf._id
      });

    } catch (error) {
      results.failed.push({
        name: file.originalname,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    message: `Uploaded ${results.success.length} of ${req.files.length} files`,
    results
  });
});

module.exports = router;

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
  console.log('Upload route accessed');
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).send('No file uploaded.');
  }

  try {
    console.log('Saving PDF to database');

    let pdfData = {
      filename: Date.now() + '-' + req.file.originalname,
      originalName: req.file.originalname,
      user: req.userId // Use JWT user ID
    };

    // Upload to Vercel Blob if available, otherwise use local storage
    if (isVercelBlobEnabled) {
      const { put } = require('@vercel/blob');
      const blob = await put(pdfData.filename, req.file.buffer, {
        access: 'public',
        contentType: 'application/pdf'
      });
      pdfData.blobUrl = blob.url;
      console.log('File uploaded to Vercel Blob:', blob.url);
    } else {
      pdfData.path = req.file.path;
      pdfData.filename = req.file.filename;
    }

    const newPdf = new Pdf(pdfData);
    await newPdf.save();
    console.log('PDF saved to database:', newPdf);

    console.log('Initiating PDF parsing');
    try {
      await parsePdf(newPdf._id);
      console.log('PDF parsed successfully');
    } catch (error) {
      console.error('Error parsing PDF:', error);
      console.error(error.stack);
    }

    console.log('Sending success response to client');
    res.status(200).send('File uploaded successfully and parsing initiated.');
  } catch (error) {
    console.error('Error in upload route:', error);
    console.error(error.stack);
    res.status(500).send('Error uploading file.');
  }
});

// Batch upload - multiple files
router.post('/upload/batch', upload.array('pdfFiles', 10), async (req, res) => {
  console.log('Batch upload route accessed');

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded.' });
  }

  const results = {
    success: [],
    failed: []
  };

  for (const file of req.files) {
    try {
      let pdfData = {
        filename: Date.now() + '-' + file.originalname,
        originalName: file.originalname,
        user: req.userId
      };

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

      // Parse PDF in background (don't wait)
      parsePdf(newPdf._id).catch(err => {
        console.error(`Error parsing PDF ${file.originalname}:`, err);
      });

      results.success.push({
        name: file.originalname,
        id: newPdf._id
      });

    } catch (error) {
      console.error(`Error uploading ${file.originalname}:`, error);
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

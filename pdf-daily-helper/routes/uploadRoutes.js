const express = require('express');
const router = express.Router();
const multer = require('multer');
const fsp = require('fs/promises');
const Pdf = require('../models/Pdf');
const { parsePdf } = require('../services/pdfParseService');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// Configure multer for file upload
const storage = multer.diskStorage({
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

async function hasValidPdfSignature(filePath) {
  let handle;
  try {
    handle = await fsp.open(filePath, 'r');
    const buffer = Buffer.alloc(4);
    await handle.read(buffer, 0, 4, 0);
    return buffer.toString('utf8', 0, 4) === '%PDF';
  } catch (error) {
    logger.error('Error checking PDF signature', { error });
    return false;
  } finally {
    if (handle) {
      await handle.close();
    }
  }
}

async function removeUploadedFile(filePath) {
  try {
    await fsp.unlink(filePath);
    logger.info('Removed uploaded file', { filePath });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error('Failed to remove uploaded file', { filePath, error });
    }
  }
}

router.post('/upload', ensureAuthenticated, upload.single('pdfFile'), async (req, res) => {
  logger.info('Upload endpoint accessed', { requestId: req.requestId, userId: req.session.userId });
  if (!req.file) {
    logger.warn('Upload attempt without file payload', { requestId: req.requestId, userId: req.session.userId });
    return res.status(400).send('No file uploaded.');
  }

  try {
    const validSignature = await hasValidPdfSignature(req.file.path);
    if (!validSignature) {
      await removeUploadedFile(req.file.path);
      logger.warn('Uploaded file rejected due to invalid PDF signature', {
        requestId: req.requestId,
        userId: req.session.userId,
      });
      return res.status(400).send('Uploaded file is not a valid PDF.');
    }

    const newPdf = new Pdf({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      user: req.session.userId
    });

    await newPdf.save();
    logger.info('PDF saved to database', {
      pdfId: newPdf._id,
      userId: req.session.userId,
      requestId: req.requestId,
    });

    try {
      await parsePdf(newPdf._id);
      logger.info('PDF parsed successfully', { pdfId: newPdf._id, requestId: req.requestId });
    } catch (error) {
      logger.error('Error parsing PDF', { error, pdfId: newPdf._id, requestId: req.requestId });
    }

    logger.info('Upload request completed successfully', { requestId: req.requestId });
    res.status(200).send('File uploaded successfully and parsing initiated.');
  } catch (error) {
    logger.error('Error in upload route', { error, requestId: req.requestId });
    res.status(500).send('Error uploading file.');
  }
});

module.exports = router;
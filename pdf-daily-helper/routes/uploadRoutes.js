const express = require('express');
const router = express.Router();
const multer = require('multer');
const Pdf = require('../models/Pdf');
const { parsePdf } = require('../services/pdfParseService');

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

router.post('/upload', upload.single('pdfFile'), async (req, res) => {
  console.log('Upload route accessed');
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).send('No file uploaded.');
  }

  try {
    console.log('Saving PDF to database');
    const newPdf = new Pdf({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      user: req.session.userId
    });

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

module.exports = router;
const express = require('express');
const router = express.Router();
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');
const fs = require('fs');

// Check if Vercel Blob is available
const isVercelBlobEnabled = !!process.env.BLOB_READ_WRITE_TOKEN;

router.get('/pdfs', async (req, res) => {
  try {
    const pdfs = await Pdf.find().sort({ uploadDate: -1 });
    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching PDFs' });
  }
});

router.delete('/pdfs/:id', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Delete the file from storage
    if (pdf.blobUrl && isVercelBlobEnabled) {
      try {
        const { del } = require('@vercel/blob');
        await del(pdf.blobUrl);
      } catch (blobErr) {
        // Continue with database deletion even if blob deletion fails
      }
    } else if (pdf.path) {
      try {
        fs.unlinkSync(pdf.path);
      } catch (fsErr) {
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete indexed data for this PDF
    await IndexedData.deleteMany({ pdfId: req.params.id });

    // Delete the document from the database
    await Pdf.findByIdAndDelete(req.params.id);
    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting PDF' });
  }
});

router.get('/pdfs/:id/parsed', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).send('PDF not found');
    }
    res.json({
      extractedText: pdf.extractedText,
      structure: pdf.structure
    });
  } catch (error) {
    res.status(500).send('Error fetching parsed PDF data');
  }
});

// Download PDF file
router.get('/pdfs/:id/download', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // If stored in Vercel Blob, redirect to blob URL
    if (pdf.blobUrl) {
      return res.redirect(pdf.blobUrl);
    }

    // If stored locally, serve the file
    if (pdf.path && fs.existsSync(pdf.path)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.originalName}"`);
      return fs.createReadStream(pdf.path).pipe(res);
    }

    res.status(404).json({ message: 'PDF file not found' });
  } catch (error) {
    res.status(500).json({ message: 'Error downloading PDF' });
  }
});

// View PDF file (inline)
router.get('/pdfs/:id/view', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // If stored in Vercel Blob, redirect to blob URL
    if (pdf.blobUrl) {
      return res.redirect(pdf.blobUrl);
    }

    // If stored locally, serve the file inline
    if (pdf.path && fs.existsSync(pdf.path)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${pdf.originalName}"`);
      return fs.createReadStream(pdf.path).pipe(res);
    }

    res.status(404).json({ message: 'PDF file not found' });
  } catch (error) {
    res.status(500).json({ message: 'Error viewing PDF' });
  }
});

// Get single PDF details
router.get('/pdfs/:id', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching PDF' });
  }
});

// Export extracted text as .txt file
router.get('/pdfs/:id/export-text', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    if (!pdf.extractedText) {
      return res.status(400).json({ message: 'No extracted text available for this PDF' });
    }

    const filename = pdf.originalName.replace(/\.pdf$/i, '') + '.txt';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf.extractedText);
  } catch (error) {
    res.status(500).json({ message: 'Error exporting text' });
  }
});

// Generate AI summary for a PDF
router.post('/pdfs/:id/summary', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'AI features not configured. Please set OPENAI_API_KEY.'
    });
  }

  try {
    const { generateSummary } = require('../services/summaryService');
    const result = await generateSummary(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate summary'
    });
  }
});

module.exports = router;

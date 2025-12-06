const express = require('express');
const router = express.Router();
const Pdf = require('../models/Pdf');
const fs = require('fs');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

router.get('/pdfs', ensureAuthenticated, async (req, res) => {
  logger.info('GET /api/pdfs invoked', { requestId: req.requestId, userId: req.session.userId });
  try {
    const pdfs = await Pdf.find({ user: req.session.userId }).sort({ uploadDate: -1 });
    res.json(pdfs);
  } catch (error) {
    logger.error('Error fetching PDFs', { error, requestId: req.requestId, userId: req.session.userId });
    res.status(500).json({ message: 'Error fetching PDFs', error: error.message });
  }
});

router.delete('/pdfs/:id', ensureAuthenticated, async (req, res) => {
  logger.info('DELETE /api/pdfs request received', {
    requestId: req.requestId,
    userId: req.session.userId,
    pdfId: req.params.id,
  });
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      logger.warn('PDF not found for deletion', { requestId: req.requestId, pdfId: req.params.id });
      return res.status(404).json({ message: 'PDF not found' });
    }
    if (!pdf.user || pdf.user.toString() !== req.session.userId) {
      logger.warn('Unauthorized delete attempt', {
        requestId: req.requestId,
        userId: req.session.userId,
        pdfOwner: pdf.user,
        pdfId: req.params.id,
      });
      return res.status(403).json({ message: 'You are not authorized to delete this PDF' });
    }

    // Delete the file from the filesystem
    fs.unlink(pdf.path, async (err) => {
      if (err) {
        logger.error('Error deleting PDF file from disk', {
          error: err,
          requestId: req.requestId,
          pdfId: req.params.id,
        });
        return res.status(500).json({ message: 'Error deleting file', error: err.message });
      }

      // Delete the document from the database
      await Pdf.findByIdAndDelete(req.params.id);
      logger.info('PDF deleted successfully', {
        requestId: req.requestId,
        pdfId: req.params.id,
        userId: req.session.userId,
      });
      res.json({ message: 'PDF deleted successfully' });
    });
  } catch (error) {
    logger.error('Error deleting PDF', { error, requestId: req.requestId, pdfId: req.params.id });
    res.status(500).json({ message: 'Error deleting PDF', error: error.message });
  }
});

router.get('/pdfs/:id/parsed', ensureAuthenticated, async (req, res) => {
  logger.info('GET /api/pdfs/:id/parsed invoked', {
    requestId: req.requestId,
    userId: req.session.userId,
    pdfId: req.params.id,
  });
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      logger.warn('PDF not found when fetching parsed data', {
        requestId: req.requestId,
        pdfId: req.params.id,
      });
      return res.status(404).send('PDF not found');
    }
    if (!pdf.user || pdf.user.toString() !== req.session.userId) {
      logger.warn('Unauthorized parsed data access attempt', {
        requestId: req.requestId,
        userId: req.session.userId,
        pdfOwner: pdf.user,
        pdfId: req.params.id,
      });
      return res.status(403).send('You are not authorized to view this PDF');
    }
    logger.info('Parsed PDF data fetched successfully', {
      requestId: req.requestId,
      pdfId: req.params.id,
    });
    res.json({
      extractedText: pdf.extractedText,
      structure: pdf.structure
    });
  } catch (error) {
    logger.error('Error fetching parsed PDF data', { error, requestId: req.requestId, pdfId: req.params.id });
    res.status(500).send('Error fetching parsed PDF data');
  }
});

module.exports = router;
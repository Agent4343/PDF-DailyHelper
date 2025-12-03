const express = require('express');
const router = express.Router();
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');
const { deletePdfChunks } = require('../services/vectorService');
const { isAuthenticated } = require('./middleware/authMiddleware');
const logger = require('../services/logger');

router.get('/pdfs', isAuthenticated, async (req, res) => {
  try {
    const pdfs = await Pdf.find({ user: req.session.userId })
      .sort({ uploadDate: -1 })
      .select('_id originalName uploadDate filename structure');
    res.json(pdfs);
  } catch (error) {
    logger.error({ err: error, userId: req.session.userId }, 'Error fetching PDFs');
    res.status(500).json({ message: 'Error fetching PDFs' });
  }
});

router.delete('/pdfs/:id', isAuthenticated, async (req, res) => {
  try {
    const pdf = await Pdf.findOne({ _id: req.params.id, user: req.session.userId });
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    await IndexedData.deleteMany({ pdfId: pdf._id });
    await deletePdfChunks(pdf._id, req.session.userId);
    await pdf.deleteOne();

    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    logger.error({ err: error, pdfId: req.params.id }, 'Error deleting PDF');
    res.status(500).json({ message: 'Error deleting PDF' });
  }
});

router.get('/pdfs/:id/parsed', isAuthenticated, async (req, res) => {
  try {
    const pdf = await Pdf.findOne({ _id: req.params.id, user: req.session.userId }).select('extractedText structure');
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    res.json({
      extractedText: pdf.extractedText || '',
      structure: pdf.structure || {}
    });
  } catch (error) {
    logger.error({ err: error, pdfId: req.params.id }, 'Error fetching parsed PDF data');
    res.status(500).json({ message: 'Error fetching parsed PDF data' });
  }
});

module.exports = router;

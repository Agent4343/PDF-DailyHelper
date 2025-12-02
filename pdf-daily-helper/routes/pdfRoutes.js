const express = require('express');
const router = express.Router();
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');
const { isAuthenticated } = require('./middleware/authMiddleware');

router.get('/pdfs', isAuthenticated, async (req, res) => {
  try {
    const pdfs = await Pdf.find({ user: req.session.userId })
      .sort({ uploadDate: -1 })
      .select('_id originalName uploadDate filename');
    res.json(pdfs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
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
    await pdf.deleteOne();

    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
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
    console.error('Error fetching parsed PDF data:', error);
    res.status(500).json({ message: 'Error fetching parsed PDF data' });
  }
});

module.exports = router;

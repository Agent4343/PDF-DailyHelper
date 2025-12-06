const express = require('express');
const router = express.Router();
const Pdf = require('../models/Pdf');
const fs = require('fs');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.get('/pdfs', ensureAuthenticated, async (req, res) => {
  console.log('GET /pdfs route accessed');
  try {
    const pdfs = await Pdf.find({ user: req.session.userId }).sort({ uploadDate: -1 });
    console.log('PDFs fetched successfully');
    res.json(pdfs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    console.error(error.stack);
    res.status(500).json({ message: 'Error fetching PDFs', error: error.message });
  }
});

router.delete('/pdfs/:id', ensureAuthenticated, async (req, res) => {
  console.log(`DELETE /pdfs/${req.params.id} route accessed`);
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      console.log('PDF not found for deletion');
      return res.status(404).json({ message: 'PDF not found' });
    }
    if (!pdf.user || pdf.user.toString() !== req.session.userId) {
      console.log(`User ${req.session.userId} attempted to delete PDF they do not own`);
      return res.status(403).json({ message: 'You are not authorized to delete this PDF' });
    }

    // Delete the file from the filesystem
    fs.unlink(pdf.path, async (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        console.error(err.stack);
        return res.status(500).json({ message: 'Error deleting file', error: err.message });
      }

      console.log(`File ${pdf.path} deleted successfully`);
      // Delete the document from the database
      await Pdf.findByIdAndDelete(req.params.id);
      console.log(`PDF with id ${req.params.id} deleted successfully from database`);
      res.json({ message: 'PDF deleted successfully' });
    });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    console.error(error.stack);
    res.status(500).json({ message: 'Error deleting PDF', error: error.message });
  }
});

router.get('/pdfs/:id/parsed', ensureAuthenticated, async (req, res) => {
  console.log(`GET /pdfs/${req.params.id}/parsed route accessed`);
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      console.log(`PDF with ID ${req.params.id} not found`);
      return res.status(404).send('PDF not found');
    }
    if (!pdf.user || pdf.user.toString() !== req.session.userId) {
      console.log(`User ${req.session.userId} attempted to access parsed data they do not own`);
      return res.status(403).send('You are not authorized to view this PDF');
    }
    console.log('Parsed PDF data fetched successfully');
    res.json({
      extractedText: pdf.extractedText,
      structure: pdf.structure
    });
  } catch (error) {
    console.error('Error fetching parsed PDF data:', error);
    console.error(error.stack);
    res.status(500).send('Error fetching parsed PDF data');
  }
});

module.exports = router;
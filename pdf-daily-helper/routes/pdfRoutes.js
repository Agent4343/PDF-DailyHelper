const express = require('express');
const router = express.Router();
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');
const fs = require('fs');

// Check if Vercel Blob is available
const isVercelBlobEnabled = !!process.env.BLOB_READ_WRITE_TOKEN;

router.get('/pdfs', async (req, res) => {
  console.log('GET /pdfs route accessed');
  try {
    const pdfs = await Pdf.find().sort({ uploadDate: -1 });
    console.log('PDFs fetched successfully');
    res.json(pdfs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    console.error(error.stack);
    res.status(500).json({ message: 'Error fetching PDFs', error: error.message });
  }
});

router.delete('/pdfs/:id', async (req, res) => {
  console.log(`DELETE /pdfs/${req.params.id} route accessed`);
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      console.log('PDF not found for deletion');
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Delete the file from storage
    if (pdf.blobUrl && isVercelBlobEnabled) {
      // Delete from Vercel Blob
      try {
        const { del } = require('@vercel/blob');
        await del(pdf.blobUrl);
        console.log(`Blob ${pdf.blobUrl} deleted successfully`);
      } catch (blobErr) {
        console.error('Error deleting from Vercel Blob:', blobErr);
        // Continue with database deletion even if blob deletion fails
      }
    } else if (pdf.path) {
      // Delete from local filesystem
      try {
        fs.unlinkSync(pdf.path);
        console.log(`File ${pdf.path} deleted successfully`);
      } catch (fsErr) {
        console.error('Error deleting local file:', fsErr);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete indexed data for this PDF
    await IndexedData.deleteMany({ pdfId: req.params.id });
    console.log(`Indexed data for PDF ${req.params.id} deleted`);

    // Delete the document from the database
    await Pdf.findByIdAndDelete(req.params.id);
    console.log(`PDF with id ${req.params.id} deleted successfully from database`);
    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    console.error(error.stack);
    res.status(500).json({ message: 'Error deleting PDF', error: error.message });
  }
});

router.get('/pdfs/:id/parsed', async (req, res) => {
  console.log(`GET /pdfs/${req.params.id}/parsed route accessed`);
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      console.log(`PDF with ID ${req.params.id} not found`);
      return res.status(404).send('PDF not found');
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

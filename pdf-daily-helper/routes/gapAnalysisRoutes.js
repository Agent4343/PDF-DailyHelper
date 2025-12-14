const express = require('express');
const router = express.Router();
const { analyzeGaps, getAvailableDocuments } = require('../services/gapAnalysisService');

// Gap analysis page
router.get('/gap-analysis', async (req, res) => {
  try {
    const documents = await getAvailableDocuments();
    res.render('gap-analysis', { documents });
  } catch (error) {
    console.error('Error loading gap analysis page:', error);
    res.render('gap-analysis', { documents: [] });
  }
});

// Get available documents for selection
router.get('/api/gap-analysis/documents', async (req, res) => {
  try {
    const documents = await getAvailableDocuments();
    res.json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

// Perform gap analysis
router.post('/api/gap-analysis', async (req, res) => {
  const { docId1, docId2 } = req.body;

  if (!docId1 || !docId2) {
    return res.status(400).json({ success: false, error: 'Please select two documents' });
  }

  if (docId1 === docId2) {
    return res.status(400).json({ success: false, error: 'Please select two different documents' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'AI features not configured. Please set OPENAI_API_KEY.'
    });
  }

  try {
    const result = await analyzeGaps(docId1, docId2);
    res.json(result);
  } catch (error) {
    console.error('Gap analysis error:', error);
    res.status(500).json({ success: false, error: 'Analysis failed. Please try again.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { searchPdfContent } = require('../services/searchService');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.get('/api/search', ensureAuthenticated, async (req, res) => {
  console.log('GET /api/search route accessed with query:', req.query);
  try {
    const dateFilter = req.query.dateFilter;
    const fileNameFilter = req.query.fileNameFilter;
    const pageNumberFilter = req.query.pageNumberFilter;
    const query = (req.query.query || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "query" is required.' });
    }
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const filters = {
      dateFilter,
      fileNameFilter,
      pageNumberFilter
    };

    const searchResults = await searchPdfContent(query, page, limit, filters, req.session.userId);
    res.json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    console.error(error.stack);
    res.status(500).json({ error: 'An error occurred while searching' });
  }
});

router.get('/search', (req, res) => {
  res.render('search');
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { searchPdfContent } = require('../services/searchService');
const { isAuthenticated } = require('./middleware/authMiddleware');

router.get('/api/search', isAuthenticated, async (req, res) => {
  try {
    const { query, page = 1, limit = 10, dateFilter, fileNameFilter, pageNumberFilter } = req.query;
    const filters = {
      dateFilter,
      fileNameFilter,
      pageNumberFilter
    };

    const searchResults = await searchPdfContent(
      query,
      parseInt(page, 10),
      parseInt(limit, 10),
      filters,
      req.session.userId
    );
    res.json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'An error occurred while searching' });
  }
});

router.get('/search', isAuthenticated, (req, res) => {
  res.render('search');
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { searchPdfContent } = require('../services/searchService');

router.get('/api/search', async (req, res) => {
  console.log('GET /api/search route accessed with query:', req.query);
  try {
    const { query, page = 1, limit = 10, dateFilter, fileNameFilter, pageNumberFilter } = req.query;
    const filters = {
      dateFilter,
      fileNameFilter,
      pageNumberFilter
    };

    const searchResults = await searchPdfContent(query, parseInt(page), parseInt(limit), filters);
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
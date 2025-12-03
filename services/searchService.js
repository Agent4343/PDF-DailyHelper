const IndexedData = require('../models/IndexedData');

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDateFilter(filterValue) {
  const match = /^(\d+)d$/i.exec(filterValue || '');
  if (!match) {
    return null;
  }

  const days = Number(match[1]);
  if (Number.isNaN(days) || days <= 0) {
    return null;
  }

  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function searchPdfContent(query, page = 1, limit = 10, filters = {}, userId) {
  if (!userId) {
    throw new Error('User ID is required to perform searches');
  }

  const sanitizedQuery = (query || '').trim();
  if (!sanitizedQuery) {
    return { results: [], total: 0, page: 1, totalPages: 0 };
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const searchQuery = {
    userId,
    $text: { $search: sanitizedQuery }
  };

  if (filters.pageNumberFilter) {
    const pageNumber = parseInt(filters.pageNumberFilter, 10);
    if (!Number.isNaN(pageNumber) && pageNumber > 0) {
      searchQuery.pageNumber = pageNumber;
    }
  }

  if (filters.dateFilter) {
    const fromDate = parseDateFilter(filters.dateFilter);
    if (fromDate) {
      searchQuery.createdAt = { $gte: fromDate };
    }
  }

  if (filters.fileNameFilter) {
    searchQuery.originalName = new RegExp(escapeRegex(filters.fileNameFilter), 'i');
  }

  const projection = {
    score: { $meta: 'textScore' },
    content: 1,
    pageNumber: 1,
    filename: 1,
    originalName: 1,
    createdAt: 1
  };

  const results = await IndexedData.find(searchQuery, projection)
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(safeLimit);

  const total = await IndexedData.countDocuments(searchQuery);

  return {
    results,
    total,
    page: safePage,
    totalPages: Math.ceil(total / safeLimit)
  };
}

module.exports = { searchPdfContent };

const IndexedData = require('../models/IndexedData');
const Pdf = require('../models/Pdf');

function normalizePositiveInteger(value, defaultValue, { min = 1, max } = {}) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < min) {
    return defaultValue;
  }
  if (max && parsed > max) {
    return max;
  }
  return parsed;
}

function extractDaysFromFilter(filterValue) {
  if (!filterValue) {
    return null;
  }
  const days = parseInt(String(filterValue).replace(/\D/g, ''), 10);
  return Number.isNaN(days) || days <= 0 ? null : days;
}

async function searchPdfContent(query, page = 1, limit = 10, filters = {}, userId) {
  console.log(`Searching PDF content with query: "${query}", page: ${page}, limit: ${limit}, filters:`, filters);
  if (!userId) {
    throw new Error('User context is required to search PDF content.');
  }

  const sanitizedQuery = (query || '').trim();
  if (!sanitizedQuery) {
    throw new Error('Search query is required.');
  }

  try {
    const normalizedPage = normalizePositiveInteger(page, 1);
    const normalizedLimit = normalizePositiveInteger(limit, 10, { min: 1, max: 100 });
    const skip = (normalizedPage - 1) * normalizedLimit;
    const searchQuery = { $text: { $search: sanitizedQuery } };

    // Apply page number filter
    if (filters.pageNumberFilter) {
      const pageNumber = normalizePositiveInteger(filters.pageNumberFilter, null);
      if (pageNumber) {
        searchQuery.pageNumber = pageNumber;
      }
    }

    // Build PDF ownership/filter constraints
    const pdfCriteria = { user: userId };

    const dateFilterDays = extractDaysFromFilter(filters.dateFilter);
    if (dateFilterDays) {
      const date = new Date();
      date.setDate(date.getDate() - dateFilterDays);
      pdfCriteria.uploadDate = { $gte: date };
    }

    if (filters.fileNameFilter) {
      pdfCriteria.originalName = new RegExp(filters.fileNameFilter, 'i');
    }

    const allowedPdfIds = await Pdf.find(pdfCriteria).distinct('_id');
    if (!allowedPdfIds.length) {
      return {
        results: [],
        total: 0,
        page: normalizedPage,
        totalPages: 0
      };
    }

    searchQuery.pdfId = { $in: allowedPdfIds };

    const [results, total] = await Promise.all([
      IndexedData.find(searchQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(normalizedLimit)
        .populate('pdfId', 'filename originalName'),
      IndexedData.countDocuments(searchQuery)
    ]);

    console.log(`Found ${total} results for query: "${sanitizedQuery}"`);

    return {
      results,
      total,
      page: normalizedPage,
      totalPages: total ? Math.ceil(total / normalizedLimit) : 0
    };
  } catch (error) {
    console.error('Error searching PDF content:', error);
    console.error(error.stack);
    throw error;
  }
}

module.exports = { searchPdfContent };
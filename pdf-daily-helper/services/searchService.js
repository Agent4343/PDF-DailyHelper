const IndexedData = require('../models/IndexedData');

async function searchPdfContent(query, page = 1, limit = 10, filters = {}) {
  console.log(`Searching PDF content with query: "${query}", page: ${page}, limit: ${limit}, filters:`, filters);
  try {
    const skip = (page - 1) * limit;
    let searchQuery = { $text: { $search: query } };

    // Apply date filter
    if (filters.dateFilter) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(filters.dateFilter.replace('d', '')));
      searchQuery.createdAt = { $gte: date };
    }

    // Apply file name filter
    if (filters.fileNameFilter) {
      searchQuery['pdfId.originalName'] = new RegExp(filters.fileNameFilter, 'i');
    }

    // Apply page number filter
    if (filters.pageNumberFilter) {
      searchQuery.pageNumber = parseInt(filters.pageNumberFilter);
    }

    const results = await IndexedData.find(searchQuery, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(limit)
      .populate('pdfId', 'filename originalName');

    const total = await IndexedData.countDocuments(searchQuery);

    console.log(`Found ${total} results for query: "${query}"`);

    return {
      results,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error searching PDF content:', error);
    console.error(error.stack);
    throw error;
  }
}

module.exports = { searchPdfContent };
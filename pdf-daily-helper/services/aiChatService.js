const OpenAI = require('openai');
const IndexedData = require('../models/IndexedData');

// Initialize OpenAI client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Search for relevant document content based on the user's question
async function searchRelevantContent(query, limit = 5) {
  try {
    // Use MongoDB text search to find relevant content
    const results = await IndexedData.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .populate('pdfId', 'filename originalName');

    return results.map(result => ({
      content: result.content,
      pageNumber: result.pageNumber,
      fileName: result.pdfId?.originalName || result.pdfId?.filename || 'Unknown',
      score: result._doc.score
    }));
  } catch (error) {
    console.error('Error searching relevant content:', error);
    // If text search fails, try a simple regex search
    const results = await IndexedData.find({
      content: { $regex: query.split(' ').join('|'), $options: 'i' }
    })
      .limit(limit)
      .populate('pdfId', 'filename originalName');

    return results.map(result => ({
      content: result.content,
      pageNumber: result.pageNumber,
      fileName: result.pdfId?.originalName || result.pdfId?.filename || 'Unknown',
      score: 1
    }));
  }
}

// Build context from search results
function buildContext(searchResults) {
  if (searchResults.length === 0) {
    return '';
  }

  let context = 'Here are relevant excerpts from the uploaded documents:\n\n';

  searchResults.forEach((result, index) => {
    context += `--- Document: "${result.fileName}" (Page ${result.pageNumber}) ---\n`;
    context += result.content.substring(0, 2000); // Limit content length
    context += '\n\n';
  });

  return context;
}

// Format sources for citation
function formatSources(searchResults) {
  const uniqueSources = [];
  const seen = new Set();

  searchResults.forEach(result => {
    const key = `${result.fileName}-${result.pageNumber}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSources.push({
        fileName: result.fileName,
        pageNumber: result.pageNumber
      });
    }
  });

  return uniqueSources;
}

// Main chat function
async function chat(userMessage, conversationHistory = []) {
  const openai = getOpenAIClient();

  // Search for relevant content
  const searchResults = await searchRelevantContent(userMessage);
  const context = buildContext(searchResults);
  const sources = formatSources(searchResults);

  // Build the system message
  const systemMessage = `You are a helpful AI assistant that answers questions based on the user's uploaded PDF documents.

Your role is to:
1. Answer questions accurately based on the provided document context
2. If the context contains relevant information, use it to answer the question
3. If the context doesn't contain enough information to answer, say so clearly
4. Always be helpful and provide clear, concise answers
5. When referencing information, mention which document it came from

${context ? 'DOCUMENT CONTEXT:\n' + context : 'No relevant documents found for this query.'}

Important: Base your answers on the document context provided above. If you cannot find relevant information in the documents, let the user know.`;

  // Build messages array
  const messages = [
    { role: 'system', content: systemMessage },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: userMessage }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective and capable model
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    });

    const assistantMessage = completion.choices[0].message.content;

    return {
      success: true,
      message: assistantMessage,
      sources: sources,
      hasContext: searchResults.length > 0
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

// Get available documents count
async function getDocumentStats() {
  const IndexedData = require('../models/IndexedData');
  const Pdf = require('../models/Pdf');

  const totalPdfs = await Pdf.countDocuments();
  const totalPages = await IndexedData.countDocuments();

  return {
    totalDocuments: totalPdfs,
    totalPages: totalPages
  };
}

module.exports = { chat, searchRelevantContent, getDocumentStats };

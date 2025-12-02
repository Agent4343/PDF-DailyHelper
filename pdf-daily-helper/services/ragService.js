const { getOpenAIClient } = require('./openaiClient');
const { searchSimilarChunks } = require('./vectorService');

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

function buildContextSection(results = []) {
  if (!results.length) {
    return 'No relevant context was found.';
  }

  return results
    .map((result, index) => {
      const header = `Source ${index + 1} (${result.original_name || result.filename || 'Unknown file'})`;
      return `${header}\nChunk #${result.chunk_index}\n${result.content}`;
    })
    .join('\n\n');
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-6)
    .map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: entry.content || ''
    }))
    .filter((entry) => entry.content.trim().length > 0);
}

async function generateChatResponse({ userId, message, history }) {
  if (!message) {
    throw new Error('Message is required');
  }

  const relatedChunks = await searchSimilarChunks({
    userId,
    query: message,
    matchCount: 5
  });

  const context = buildContextSection(relatedChunks);
  const openai = getOpenAIClient();

  const messages = [
    {
      role: 'system',
      content: 'You are a helpful assistant that answers questions using only the provided context from PDFs. If the answer is not in the context, say you do not know.'
    },
    ...normalizeHistory(history),
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${message}`
    }
  ];

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages
  });

  const answer = completion.choices[0]?.message?.content || 'I was unable to generate a response.';

  return {
    answer,
    sources: relatedChunks
  };
}

module.exports = { generateChatResponse };

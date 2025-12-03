const { getOpenAIClient } = require('./openaiClient');
const { searchSimilarChunks } = require('./vectorService');

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

function buildContextSection(sources = []) {
  if (!sources.length) {
    return 'No relevant context was found.';
  }

  return sources
    .map((source) => {
      const header = `Source ${source.citation} (${source.original_name || source.filename || 'Unknown file'}${
        source.pageNumber ? ` · Page ${source.pageNumber}` : ''
      })`;
      return `${header}\n${source.content}`;
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

async function prepareChatPrompt({ userId, message, history }) {
  if (!message) {
    throw new Error('Message is required');
  }

  const relatedChunks = await searchSimilarChunks({
    userId,
    query: message,
    matchCount: 5
  });

  const annotatedSources = relatedChunks.map((chunk, index) => ({
    citation: index + 1,
    content: chunk.content,
    original_name: chunk.original_name || chunk.filename || '',
    filename: chunk.filename,
    pageNumber: chunk.pageNumber,
    chunk_index: chunk.chunk_index
  }));

  const context = buildContextSection(annotatedSources);
  const normalizedHistory = normalizeHistory(history);

  const messages = [
    {
      role: 'system',
      content:
        'You are a helpful assistant that answers questions using ONLY the provided sources. Cite sources inline using [n] where n matches Source n. If the answer is not present in the sources, respond: "I do not know based on the provided context."'
    },
    ...normalizedHistory,
    {
      role: 'user',
      content: `Sources:\n${context}\n\nQuestion: ${message}`
    }
  ];

  return { messages, sources: annotatedSources };
}

async function generateChatResponse(params) {
  const { messages, sources } = await prepareChatPrompt(params);
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages
  });

  const answer = completion.choices[0]?.message?.content || 'I was unable to generate a response.';

  return {
    answer,
    sources
  };
}

async function streamChatResponse({ userId, message, history, onChunk, onReady }) {
  const { messages, sources } = await prepareChatPrompt({ userId, message, history });

  if (typeof onReady === 'function') {
    onReady(sources);
  }

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages,
    stream: true
  });

  for await (const part of completion) {
    const chunk = part.choices?.[0]?.delta?.content;
    if (chunk && typeof onChunk === 'function') {
      onChunk(chunk);
    }
  }

  return { sources };
}

module.exports = {
  generateChatResponse,
  streamChatResponse,
  prepareChatPrompt
};

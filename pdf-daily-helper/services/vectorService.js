const crypto = require('crypto');
const { getOpenAIClient } = require('./openaiClient');
const { getSupabaseClient } = require('./supabaseClient');

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDINGS_TABLE = process.env.SUPABASE_EMBEDDINGS_TABLE || 'pdf_chunks';
const MATCH_RPC = process.env.SUPABASE_MATCH_RPC || 'match_pdf_chunks';

function chunkText(text, chunkSize = 800, overlap = 120) {
  if (!text) return [];

  const tokens = text
    .split(/\s+/)
    .filter(Boolean);

  const chunks = [];
  let index = 0;

  for (let i = 0; i < tokens.length; i += chunkSize - overlap) {
    const slice = tokens.slice(i, i + chunkSize);
    const content = slice.join(' ').trim();
    if (!content) continue;

    chunks.push({
      id: crypto.randomUUID(),
      index,
      content
    });
    index += 1;
  }

  return chunks;
}

async function createEmbeddings(inputs = []) {
  if (!inputs.length) return [];

  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs
  });

  return response.data.map(({ embedding }) => embedding);
}

async function upsertPdfChunks({ pdfId, userId, text, filename, originalName }) {
  if (!text || !pdfId || !userId) {
    return;
  }

  const chunks = chunkText(text);
  if (!chunks.length) {
    return;
  }

  const embeddings = await createEmbeddings(chunks.map((chunk) => chunk.content));
  const payload = chunks.map((chunk, idx) => ({
    id: chunk.id,
    pdf_id: pdfId.toString(),
    user_id: userId.toString(),
    chunk_index: chunk.index,
    content: chunk.content,
    filename,
    original_name: originalName,
    embedding: embeddings[idx]
  }));

  const supabase = getSupabaseClient();
  const { error } = await supabase.from(EMBEDDINGS_TABLE).upsert(payload);
  if (error) {
    throw new Error(`Failed to upsert embeddings: ${error.message}`);
  }
}

async function deletePdfChunks(pdfId, userId) {
  if (!pdfId || !userId) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(EMBEDDINGS_TABLE)
    .delete()
    .match({ pdf_id: pdfId.toString(), user_id: userId.toString() });
  if (error) {
    throw new Error(`Failed to delete embeddings: ${error.message}`);
  }
}

async function searchSimilarChunks({ userId, query, matchCount = 5, matchThreshold = 0.5 }) {
  if (!query || !userId) return [];

  const [queryEmbedding] = await createEmbeddings([query]);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc(MATCH_RPC, {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
    filter_pdf_id: null,
    user_id: userId.toString()
  });

  if (error) {
    throw new Error(`Failed to search embeddings: ${error.message}`);
  }

  return data || [];
}

module.exports = {
  upsertPdfChunks,
  deletePdfChunks,
  searchSimilarChunks,
  chunkTextForTest: chunkText
};

const OpenAI = require('openai');
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function getDocumentContent(pdfId) {
  const pdf = await Pdf.findById(pdfId);
  if (!pdf) throw new Error('Document not found');

  const indexedPages = await IndexedData.find({ pdfId }).sort({ pageNumber: 1 });

  return {
    id: pdf._id,
    name: pdf.originalName || pdf.filename,
    totalPages: indexedPages.length,
    fullText: indexedPages.map(p => p.content).join('\n\n')
  };
}

async function analyzeGaps(docId1, docId2) {
  const openai = getOpenAIClient();
  const [doc1, doc2] = await Promise.all([
    getDocumentContent(docId1),
    getDocumentContent(docId2)
  ]);

  const maxChars = 15000;
  const doc1Text = doc1.fullText.substring(0, maxChars);
  const doc2Text = doc2.fullText.substring(0, maxChars);

  const systemPrompt = `You are an expert document analyst. Compare two documents and provide a structured gap analysis with these sections:

## Common Topics
Topics covered in BOTH documents

## Only in Document A
Topics/requirements in Document A but MISSING from Document B

## Only in Document B
Topics/requirements in Document B but MISSING from Document A

## Key Differences
Where both documents cover the same topic but differ in approach, requirements, or details

Be specific with examples. Use bullet points.`;

  const userPrompt = `Perform a gap analysis:

=== DOCUMENT A: "${doc1.name}" ===
${doc1Text}

=== DOCUMENT B: "${doc2.name}" ===
${doc2Text}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 2000,
    temperature: 0.3
  });

  return {
    success: true,
    analysis: completion.choices[0].message.content,
    documents: {
      docA: { id: doc1.id, name: doc1.name, pages: doc1.totalPages },
      docB: { id: doc2.id, name: doc2.name, pages: doc2.totalPages }
    },
    truncated: doc1.fullText.length > maxChars || doc2.fullText.length > maxChars
  };
}

async function getAvailableDocuments() {
  const pdfs = await Pdf.find({ extractedText: { $exists: true, $ne: '' } })
    .select('_id filename originalName uploadDate')
    .sort({ uploadDate: -1 });

  return pdfs.map(pdf => ({
    id: pdf._id,
    name: pdf.originalName || pdf.filename,
    uploadDate: pdf.uploadDate
  }));
}

module.exports = { analyzeGaps, getAvailableDocuments };

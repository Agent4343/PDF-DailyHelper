const OpenAI = require('openai');
const Pdf = require('../models/Pdf');

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function generateSummary(pdfId) {
  const openai = getOpenAIClient();

  const pdf = await Pdf.findById(pdfId);
  if (!pdf) throw new Error('PDF not found');

  if (!pdf.extractedText || pdf.extractedText.trim().length === 0) {
    throw new Error('No text content available for this PDF');
  }

  // Truncate text if too long
  const maxChars = 12000;
  const text = pdf.extractedText.substring(0, maxChars);
  const truncated = pdf.extractedText.length > maxChars;

  const systemPrompt = `You are an expert document summarizer. Provide a clear, structured summary of the document with:

1. **Overview**: A 2-3 sentence high-level summary
2. **Key Points**: Main topics or findings (bullet points)
3. **Important Details**: Critical information, dates, figures, or requirements
4. **Conclusion**: Final takeaway or action items if applicable

Be concise but comprehensive. Use bullet points for clarity.`;

  const userPrompt = `Please summarize this document:\n\n${text}${truncated ? '\n\n[Document truncated due to length]' : ''}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 1000,
    temperature: 0.3
  });

  return {
    success: true,
    name: pdf.originalName || pdf.filename,
    summary: completion.choices[0].message.content,
    truncated
  };
}

module.exports = { generateSummary };

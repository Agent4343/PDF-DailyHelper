const pdf = require('pdf-parse');
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');
const { upsertPdfChunks } = require('./vectorService');
const { extractTextWithOcr, DEFAULT_TRIGGER_THRESHOLD } = require('./ocrService');

async function parsePdf(pdfId, fileBuffer) {
  const pdfDoc = await Pdf.findById(pdfId);

  if (!pdfDoc) {
    throw new Error(`PDF with ID ${pdfId} not found`);
  }

  const sourceBuffer = fileBuffer || pdfDoc.fileData;

  if (!sourceBuffer) {
    throw new Error('PDF binary data is missing. Please re-upload the file.');
  }

  const data = await pdf(sourceBuffer);
  let text = data.text || '';
  const structure = {
    numPages: data.numpages || 0,
    info: data.info || {}
  };

  if (text.trim().length < DEFAULT_TRIGGER_THRESHOLD) {
    try {
      const ocrText = await extractTextWithOcr(sourceBuffer);
      if (ocrText) {
        text = ocrText;
        structure.ocrApplied = true;
      }
    } catch (error) {
      console.error('OCR extraction failed:', error);
    }
  }

  pdfDoc.extractedText = text;
  pdfDoc.structure = structure;

  if (fileBuffer) {
    pdfDoc.fileData = fileBuffer;
  }

  await pdfDoc.save();

  await indexPdfContent({
    pdfId: pdfDoc._id,
    userId: pdfDoc.user,
    content: text,
    numPages: structure.numPages || 1,
    filename: pdfDoc.filename,
    originalName: pdfDoc.originalName
  });

  try {
    await upsertPdfChunks({
      pdfId: pdfDoc._id,
      userId: pdfDoc.user,
      text,
      filename: pdfDoc.filename,
      originalName: pdfDoc.originalName
    });
  } catch (error) {
    console.error('Failed to upsert embeddings:', error);
  }

  return { text, structure };
}

async function indexPdfContent({ pdfId, userId, content, numPages, filename, originalName }) {
  await IndexedData.deleteMany({ pdfId });

  if (!content) {
    return;
  }

  const safeNumPages = Math.max(1, numPages);
  const paragraphs = content.split(/\n{2,}/);
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / safeNumPages));

  for (let i = 0; i < safeNumPages; i += 1) {
    const chunk = paragraphs.slice(i * chunkSize, (i + 1) * chunkSize).join('\n').trim();

    if (!chunk) {
      continue;
    }

    await IndexedData.create({
      pdfId,
      userId,
      filename,
      originalName,
      content: chunk,
      pageNumber: i + 1
    });
  }
}

module.exports = { parsePdf };

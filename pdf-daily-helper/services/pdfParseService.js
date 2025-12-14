const fs = require('fs');
const pdf = require('pdf-parse');
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');
const { extractTextWithOCR, hasExtractableText } = require('./ocrService');

async function fetchPdfBuffer(pdfDoc) {
  // If there's a blob URL (Vercel Blob), fetch from it
  if (pdfDoc.blobUrl) {
    console.log(`Fetching PDF from Vercel Blob: ${pdfDoc.blobUrl}`);
    const response = await fetch(pdfDoc.blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from Blob: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Otherwise, read from local filesystem
  if (pdfDoc.path) {
    console.log(`Reading file from local path: ${pdfDoc.path}`);
    return fs.readFileSync(pdfDoc.path);
  }

  throw new Error('No valid file location found for PDF');
}

async function parsePdf(pdfId) {
  console.log(`Parsing PDF with ID: ${pdfId}`);
  try {
    const pdfDoc = await Pdf.findById(pdfId);
    if (!pdfDoc) {
      console.log(`PDF with ID ${pdfId} not found`);
      throw new Error('PDF not found');
    }

    const dataBuffer = await fetchPdfBuffer(pdfDoc);
    console.log('File read successfully, parsing PDF');

    // First, try standard text extraction
    const data = await pdf(dataBuffer);
    let text = data.text;
    let ocrUsed = false;

    const structure = {
      numPages: data.numpages,
      info: data.info
    };

    // Check if we got meaningful text
    if (!hasExtractableText(text)) {
      console.log('No extractable text found, attempting OCR...');
      try {
        const ocrResult = await extractTextWithOCR(dataBuffer, text);
        text = ocrResult.text;
        ocrUsed = ocrResult.ocrUsed;

        if (ocrUsed) {
          console.log(`OCR extracted ${text.length} characters`);
          structure.ocrUsed = true;
        }
      } catch (ocrError) {
        console.error('OCR failed, using empty text:', ocrError.message);
        // Continue with whatever text we have
      }
    }

    console.log('Updating PDF document with extracted data');
    pdfDoc.extractedText = text;
    pdfDoc.structure = structure;
    await pdfDoc.save();

    console.log('Indexing PDF content');
    await indexPdfContent(pdfId, text, structure.numPages);

    console.log('PDF parsing and indexing successful:', {
      pdfId,
      textLength: text.length,
      numPages: structure.numPages,
      ocrUsed
    });

    return { text, structure, ocrUsed };
  } catch (error) {
    console.error('Error in parsePdf function:', error);
    console.error(error.stack);
    throw error;
  }
}

async function indexPdfContent(pdfId, content, numPages) {
  // Clear existing indexed data for this PDF
  await IndexedData.deleteMany({ pdfId });

  if (!content || content.trim().length === 0) {
    console.log('No content to index');
    return;
  }

  const pageSize = Math.ceil(content.length / numPages);
  for (let i = 0; i < numPages; i++) {
    try {
      const pageContent = content.substr(i * pageSize, pageSize).trim();
      if (pageContent.length > 0) {
        await IndexedData.create({
          pdfId: pdfId,
          content: pageContent,
          pageNumber: i + 1
        });
      }
    } catch (error) {
      console.error(`Error indexing page ${i + 1} of PDF ${pdfId}:`, error);
    }
  }
  console.log(`Indexed ${numPages} pages for PDF ${pdfId}`);
}

module.exports = { parsePdf };

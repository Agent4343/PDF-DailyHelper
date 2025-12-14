const Tesseract = require('tesseract.js');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Minimum text length to consider PDF as having extractable text
const MIN_TEXT_LENGTH = 50;

/**
 * Check if text extraction returned meaningful content
 */
function hasExtractableText(text) {
  if (!text) return false;
  // Remove whitespace and check length
  const cleanText = text.replace(/\s+/g, ' ').trim();
  return cleanText.length >= MIN_TEXT_LENGTH;
}

/**
 * Perform OCR on a PDF buffer
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<{text: string, pages: number}>}
 */
async function performOCR(pdfBuffer) {
  console.log('Starting OCR process...');

  // Dynamic import for pdfjs-dist (ES module)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  console.log(`PDF has ${numPages} pages, performing OCR...`);

  let fullText = '';
  const pageTexts = [];

  // Create Tesseract worker
  const worker = await Tesseract.createWorker('eng');

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${numPages}...`);

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale = better OCR

      // Create canvas
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to buffer
      const imageBuffer = canvas.toBuffer('image/png');

      // Perform OCR
      const { data: { text } } = await worker.recognize(imageBuffer);

      const pageText = text.trim();
      pageTexts.push(pageText);
      fullText += pageText + '\n\n';

      console.log(`Page ${pageNum} OCR complete: ${pageText.length} characters`);
    }
  } finally {
    await worker.terminate();
  }

  console.log(`OCR complete. Total text: ${fullText.length} characters`);

  return {
    text: fullText.trim(),
    pages: numPages,
    pageTexts: pageTexts,
    ocrUsed: true
  };
}

/**
 * Extract text from PDF, using OCR if needed
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} existingText - Text already extracted by pdf-parse
 * @returns {Promise<{text: string, ocrUsed: boolean}>}
 */
async function extractTextWithOCR(pdfBuffer, existingText = '') {
  // Check if we already have good text
  if (hasExtractableText(existingText)) {
    console.log('PDF has extractable text, skipping OCR');
    return {
      text: existingText,
      ocrUsed: false
    };
  }

  // No good text found, use OCR
  console.log('PDF appears to be scanned/image-based, using OCR');
  return await performOCR(pdfBuffer);
}

module.exports = {
  performOCR,
  extractTextWithOCR,
  hasExtractableText,
  MIN_TEXT_LENGTH
};

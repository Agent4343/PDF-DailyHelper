const fs = require('fs');
const pdf = require('pdf-parse');
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');
const logger = require('../utils/logger');

async function parsePdf(pdfId) {
  logger.info('Parsing PDF requested', { pdfId });
  try {
    const pdfDoc = await Pdf.findById(pdfId);
    if (!pdfDoc) {
      logger.warn('PDF not found for parsing', { pdfId });
      throw new Error('PDF not found');
    }

    logger.info('Reading PDF file from disk', { pdfId, path: pdfDoc.path });
    const dataBuffer = fs.readFileSync(pdfDoc.path);
    logger.info('PDF file read successfully', { pdfId });
    const data = await pdf(dataBuffer);

    logger.info('PDF parsed, extracting text and structure', { pdfId });
    const text = data.text;
    const structure = {
      numPages: data.numpages,
      info: data.info
    };

    logger.info('Updating PDF document with extracted data', { pdfId });
    pdfDoc.extractedText = text;
    pdfDoc.structure = structure;
    await pdfDoc.save();

    logger.info('Indexing PDF content', { pdfId, numPages: structure.numPages });
    await indexPdfContent(pdfId, text, structure.numPages);

    logger.info('PDF parsing and indexing successful', {
      pdfId,
      textLength: text.length,
      numPages: structure.numPages,
    });

    return { text, structure };
  } catch (error) {
    logger.error('Error in parsePdf function', { error, pdfId });
    throw error;
  }
}

async function indexPdfContent(pdfId, content, numPages) {
  const pageSize = Math.ceil(content.length / numPages);
  for (let i = 0; i < numPages; i++) {
    try {
      const pageContent = content.substr(i * pageSize, pageSize).trim();
      await IndexedData.create({
        pdfId: pdfId,
        content: pageContent,
        pageNumber: i + 1
      });
    } catch (error) {
      logger.error('Error indexing PDF page', { error, pdfId, pageNumber: i + 1 });
    }
  }
  logger.info('Indexed PDF pages successfully', { pdfId, numPages });
}

module.exports = { parsePdf };
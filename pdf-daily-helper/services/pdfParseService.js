const fs = require('fs');
const pdf = require('pdf-parse');
const Pdf = require('../models/Pdf');
const IndexedData = require('../models/IndexedData');

async function parsePdf(pdfId) {
  console.log(`Parsing PDF with ID: ${pdfId}`);
  try {
    const pdfDoc = await Pdf.findById(pdfId);
    if (!pdfDoc) {
      console.log(`PDF with ID ${pdfId} not found`);
      throw new Error('PDF not found');
    }

    console.log(`Reading file: ${pdfDoc.path}`);
    const dataBuffer = fs.readFileSync(pdfDoc.path);
    console.log('File read successfully, parsing PDF');
    const data = await pdf(dataBuffer);

    console.log('PDF parsed, extracting text and structure');
    const text = data.text;
    const structure = {
      numPages: data.numpages,
      info: data.info
    };

    console.log('Updating PDF document with extracted data');
    pdfDoc.extractedText = text;
    pdfDoc.structure = structure;
    await pdfDoc.save();

    console.log('Indexing PDF content');
    await indexPdfContent(pdfId, text, structure.numPages);

    console.log('PDF parsing and indexing successful:', { pdfId, textLength: text.length, numPages: structure.numPages });

    return { text, structure };
  } catch (error) {
    console.error('Error in parsePdf function:', error);
    console.error(error.stack);
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
      console.error(`Error indexing page ${i + 1} of PDF ${pdfId}:`, error);
    }
  }
  console.log(`Indexed ${numPages} pages for PDF ${pdfId}`);
}

module.exports = { parsePdf };
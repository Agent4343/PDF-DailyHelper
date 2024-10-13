const mongoose = require('mongoose');

const indexedDataSchema = new mongoose.Schema({
  pdfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pdf', required: true },
  content: { type: String, required: true },
  pageNumber: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

indexedDataSchema.index({ content: 'text' });

if (process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_API_KEY) {
  const mongooseAlgolia = require('mongoose-algolia');
  indexedDataSchema.plugin(mongooseAlgolia, {
    appId: process.env.ALGOLIA_APP_ID,
    apiKey: process.env.ALGOLIA_API_KEY,
    indexName: 'pdf_content',
    selector: 'content pageNumber',
    populate: {
      path: 'pdfId',
      select: 'filename originalName'
    },
    debug: true
  });
} else {
  console.log('Algolia integration not configured. Skipping Algolia setup.');
}

const IndexedData = mongoose.model('IndexedData', indexedDataSchema);

module.exports = IndexedData;
const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String }, // Local path (for local development)
  blobUrl: { type: String }, // Vercel Blob URL (for production)
  uploadDate: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  extractedText: { type: String },
  structure: { type: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.model('Pdf', pdfSchema);
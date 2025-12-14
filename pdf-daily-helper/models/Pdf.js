const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String }, // Local path (for local development)
  blobUrl: { type: String }, // Vercel Blob URL (for production)
  uploadDate: { type: Date, default: Date.now },
  // User field removed for privacy - documents are anonymous
  extractedText: { type: String },
  structure: { type: mongoose.Schema.Types.Mixed },
  // Auto-delete after specified time (optional)
  expiresAt: { type: Date, index: { expires: 0 } }
});

module.exports = mongoose.model('Pdf', pdfSchema);
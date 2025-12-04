const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  extractedText: { type: String },
  structure: { type: mongoose.Schema.Types.Mixed },
  mimeType: { type: String, default: 'application/pdf' },
  fileSize: { type: Number, default: 0 },
  fileData: { type: Buffer }
});

pdfSchema.index({ user: 1, uploadDate: -1 });

module.exports = mongoose.model('Pdf', pdfSchema);
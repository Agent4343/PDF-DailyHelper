const express = require('express');
const router = express.Router();
const { chat, getDocumentStats } = require('../services/aiChatService');

// Chat page
router.get('/chat', async (req, res) => {
  try {
    const stats = await getDocumentStats();
    res.render('chat', { stats });
  } catch (error) {
    console.error('Error loading chat page:', error);
    res.render('chat', { stats: { totalDocuments: 0, totalPages: 0 } });
  }
});

// API endpoint for chat
router.post('/api/chat', async (req, res) => {
  console.log('POST /api/chat route accessed');

  const { message, history } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'AI chat is not configured. Please set the OPENAI_API_KEY environment variable.'
    });
  }

  try {
    const result = await chat(message.trim(), history || []);
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API quota exceeded. Please check your billing settings.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(503).json({
        success: false,
        error: 'Invalid OpenAI API key. Please check your configuration.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request. Please try again.'
    });
  }
});

// Get document stats for chat interface
router.get('/api/chat/stats', async (req, res) => {
  try {
    const stats = await getDocumentStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting document stats:', error);
    res.status(500).json({ error: 'Failed to get document stats' });
  }
});

module.exports = router;

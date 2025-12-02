const express = require('express');
const router = express.Router();
const { generateChatResponse } = require('../services/ragService');
const { isAuthenticated } = require('./middleware/authMiddleware');

router.get('/chat', isAuthenticated, (req, res) => {
  res.render('chat');
});

router.post('/api/chat', isAuthenticated, async (req, res) => {
  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const response = await generateChatResponse({
      userId: req.session.userId,
      message,
      history
    });

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Unable to generate response at this time.' });
  }
});

module.exports = router;

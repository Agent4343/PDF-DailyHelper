const express = require('express');
const router = express.Router();
const { generateChatResponse, streamChatResponse } = require('../services/ragService');
const { isAuthenticated } = require('./middleware/authMiddleware');
const logger = require('../services/logger');

const MAX_HISTORY_ENTRIES = 10;

router.get('/chat', isAuthenticated, (req, res) => {
  res.render('chat');
});

router.get('/api/chat/history', isAuthenticated, (req, res) => {
  res.json({ history: req.session.chatHistory || [] });
});

router.post('/api/chat', isAuthenticated, async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const history = req.session.chatHistory || [];
    const response = await generateChatResponse({
      userId: req.session.userId,
      message,
      history
    });

    persistHistory(req, message, response.answer);
    res.json(response);
  } catch (error) {
    logger.error({ err: error, userId: req.session.userId }, 'Chat error');
    res.status(500).json({ message: 'Unable to generate response at this time.' });
  }
});

router.post('/api/chat/stream', isAuthenticated, async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  let assistantAnswer = '';

  try {
    const history = req.session.chatHistory || [];
    await streamChatResponse({
      userId: req.session.userId,
      message,
      history,
      onReady: (sources) => {
        send('sources', { sources });
      },
      onChunk: (chunk) => {
        assistantAnswer += chunk;
        send('chunk', { content: chunk });
      }
    });

    persistHistory(req, message, assistantAnswer);
    send('done', { message: 'complete' });
    res.end();
  } catch (error) {
    logger.error({ err: error, userId: req.session.userId }, 'Streaming chat error');
    send('error', { message: 'Unable to generate response at this time.' });
    res.end();
  }
});

function persistHistory(req, userMessage, assistantMessage) {
  const history = req.session.chatHistory || [];
  const timestamp = new Date().toISOString();
  history.push({ role: 'user', content: userMessage, timestamp });
  history.push({ role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() });
  req.session.chatHistory = history.slice(-MAX_HISTORY_ENTRIES);
}

module.exports = router;

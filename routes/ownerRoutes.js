const express = require('express');
const Setting = require('../models/Setting');
const { isAuthenticated, requireOwner } = require('./middleware/authMiddleware');
const logger = require('../services/logger');

const router = express.Router();

router.get('/owner/settings', isAuthenticated, requireOwner, async (req, res) => {
  try {
    const settings = await Setting.find().sort({ key: 1 });
    res.render('owner-settings', { settings, status: req.query.status });
  } catch (error) {
    logger.error({ err: error }, 'Failed to load owner settings');
    res.status(500).send('Unable to load owner settings');
  }
});

router.post('/owner/settings', isAuthenticated, requireOwner, async (req, res) => {
  const { key, value } = req.body || {};
  if (!key || !value) {
    return res.status(400).send('Key and value are required');
  }

  try {
    await Setting.findOneAndUpdate(
      { key },
      { value, updatedBy: req.session.userId, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.redirect('/owner/settings?status=success');
  } catch (error) {
    logger.error({ err: error, key }, 'Failed to save owner setting');
    res.status(500).send('Unable to save setting');
  }
});

module.exports = router;

const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const router = express.Router();
const logger = require('../services/logger');

router.get('/auth/register', (req, res) => {
  res.render('register');
});

router.post('/auth/register', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    const user = new User({ username, password, role: 'user' });
    await user.save();
    res.redirect('/auth/login');
  } catch (error) {
    logger.error({ err: error, username }, 'Registration error');
    res.status(400).send('Error registering user');
  }
});

router.get('/auth/login', (req, res) => {
  logger.info('GET /auth/login route accessed');
  res.render('login');
});

router.post('/auth/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  if (!username || !password) {
    return res.status(400).send('Invalid username or password');
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send('Invalid username or password');
    }

    req.session.userId = user._id;
    req.session.role = user.role;
    return res.redirect('/');
  } catch (error) {
    logger.error({ err: error, username }, 'Login error');
    res.status(400).send('Error during login');
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      logger.error({ err }, 'Error during session destruction');
      return res.status(500).send('Error logging out');
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;
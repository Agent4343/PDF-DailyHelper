const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const router = express.Router();

router.get('/auth/register', (req, res) => {
  logger.info('GET /auth/register accessed', { requestId: req.requestId });
  res.render('register');
});

router.post('/auth/register', async (req, res) => {
  logger.info("Registration attempt received", { username: req.body.username, requestId: req.requestId });
  try {
    const user = new User({ username: req.body.username, password: req.body.password });
    await user.save();
    logger.info("User registered successfully", { username: user.username, requestId: req.requestId });
    res.redirect('/auth/login');
  } catch (error) {
    logger.error("Registration error", { error, requestId: req.requestId });
    res.status(400).send("Error registering user");
  }
});

router.get('/auth/login', (req, res) => {
  logger.info('GET /auth/login accessed', { requestId: req.requestId });
  res.render('login');
});

router.post('/auth/login', async (req, res) => {
  logger.info('Login attempt received', { username: req.body.username, requestId: req.requestId });
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user) {
      const result = await bcrypt.compare(req.body.password, user.password);
      if (result) {
        req.session.userId = user._id;
        logger.info("User logged in successfully", { username: user.username, requestId: req.requestId });
        return res.redirect("/");
      } else {
        logger.warn("Login failed due to incorrect password", { username: user.username, requestId: req.requestId });
        res.status(400).send("Invalid username or password");
      }
    } else {
      logger.warn("Login failed: user not found", { username: req.body.username, requestId: req.requestId });
      res.status(400).send("Invalid username or password");
    }
  } catch (error) {
    logger.error("Login error", { error, requestId: req.requestId });
    res.status(400).send("Error during login");
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      logger.error('Error during session destruction', { error: err, requestId: req.requestId });
      return res.status(500).send('Error logging out');
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;
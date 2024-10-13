const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const router = express.Router();

router.get('/auth/register', (req, res) => {
  res.render('register');
});

router.post('/auth/register', async (req, res) => {
  console.log("Registration attempt with username:", req.body.username);
  try {
    const user = new User({ username: req.body.username, password: req.body.password });
    await user.save();
    console.log("User registered successfully:", user.username);
    res.redirect('/auth/login');
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).send("Error registering user");
  }
});

router.get('/auth/login', (req, res) => {
  console.log('GET /auth/login route accessed');
  res.render('login');
});

router.post('/auth/login', async (req, res) => {
  console.log('POST /auth/login route accessed');
  console.log('Request body:', req.body);
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user) {
      const result = await bcrypt.compare(req.body.password, user.password);
      if (result) {
        req.session.userId = user._id;
        console.log("User logged in successfully:", user.username);
        return res.redirect("/");
      } else {
        console.log("Login failed: Incorrect password for user:", user.username);
        res.status(400).send("Invalid username or password");
      }
    } else {
      console.log("Login failed: User not found:", req.body.username);
      res.status(400).send("Invalid username or password");
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).send("Error during login");
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error during session destruction:', err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

userSchema.pre('save', async function (next) {
  logger.info("Hashing password for user", { username: this.username });
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    logger.info("Password hashed successfully for user", { username: this.username });
    next();
  } catch (error) {
    logger.error("Error hashing password", { error, username: this.username });
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
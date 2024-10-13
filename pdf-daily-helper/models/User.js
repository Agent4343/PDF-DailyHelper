const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

userSchema.pre('save', async function (next) {
  console.log("Hashing password for user:", this.username);
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("Password hashed successfully for user:", this.username);
    next();
  } catch (error) {
    console.error("Error hashing password:", error);
    console.error(error.stack);
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
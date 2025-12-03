const bcrypt = require('bcrypt');
const User = require('../models/User');
const logger = require('./logger');

async function ensureOwnerAccount() {
  const username = (process.env.OWNER_USERNAME || '').trim();
  const password = process.env.OWNER_PASSWORD || '';

  if (!username || !password) {
    logger.warn('OWNER_USERNAME or OWNER_PASSWORD not set. Owner account not provisioned.');
    return;
  }

  let owner = await User.findOne({ username });
  if (!owner) {
    owner = new User({
      username,
      password,
      role: 'owner'
    });
    await owner.save();
    logger.info({ username }, 'Owner account created');
    return;
  }

  let modified = false;
  if (owner.role !== 'owner') {
    owner.role = 'owner';
    modified = true;
  }

  const passwordMatches = await bcrypt.compare(password, owner.password);
  if (!passwordMatches) {
    owner.password = password;
    modified = true;
  }

  if (modified) {
    await owner.save();
    logger.info({ username }, 'Owner account updated');
  } else {
    logger.info({ username }, 'Owner account already up-to-date');
  }
}

module.exports = { ensureOwnerAccount };

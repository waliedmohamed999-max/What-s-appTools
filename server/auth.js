const crypto = require('crypto');
const { db } = require('./database');

function genId(prefix) {
  return `${prefix}${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// DMS is a single-owner toolkit with no login screen: every request is attributed to
// this one auto-provisioned account, created on first use if it doesn't exist yet.
function getOrCreateOwner() {
  const existing = db.prepare('SELECT id, email FROM users ORDER BY created_at LIMIT 1').get();
  if (existing) return existing;

  const user = { id: genId('u'), email: 'owner@local', createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    user.id,
    user.email,
    hashPassword(crypto.randomBytes(32).toString('hex')),
    user.createdAt
  );
  return { id: user.id, email: user.email };
}

module.exports = { getOrCreateOwner };

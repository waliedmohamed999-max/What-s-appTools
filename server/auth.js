const crypto = require('crypto');
const { db } = require('./database');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 256;

function genId(prefix) {
  return `${prefix}${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(hash, 'hex');
  return candidate.length === original.length && crypto.timingSafeEqual(candidate, original);
}

function registerUser(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error('بريد إلكتروني غير صالح / Invalid email address');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل / Password must be at least 8 characters');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('كلمة المرور طويلة جداً / Password is too long');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new Error('هذا البريد مسجل بالفعل / This email is already registered');
  }

  const user = { id: genId('u'), email: normalizedEmail, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    user.id,
    user.email,
    user.passwordHash,
    user.createdAt
  );
  return { id: user.id, email: user.email };
}

function loginUser(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const suppliedPassword = typeof password === 'string' ? password : '';
  if (normalizedEmail.length > MAX_EMAIL_LENGTH || suppliedPassword.length > MAX_PASSWORD_LENGTH) {
    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة / Incorrect email or password');
  }
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!row || !verifyPassword(suppliedPassword, row.password_hash)) {
    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة / Incorrect email or password');
  }
  return { id: row.id, email: row.email };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return { token, expiresAt };
}

function getUserBySessionToken(token) {
  if (!token) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(session.user_id);
  return user || null;
}

function deleteSession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function hasUsers() {
  return db.prepare('SELECT COUNT(*) AS count FROM users').get().count > 0;
}

module.exports = { registerUser, loginUser, createSession, getUserBySessionToken, deleteSession, hasUsers };

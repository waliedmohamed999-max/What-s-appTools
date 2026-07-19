const crypto = require('crypto');
const { db } = require('./database');

const ALLOWED_PLATFORMS = ['instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'snapchat'];

function genId() {
  return `p${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
}

function rowToPost(row) {
  return {
    id: row.id,
    platform: row.platform,
    caption: row.caption,
    scheduledAt: row.scheduled_at,
    media: row.media_json ? JSON.parse(row.media_json) : null,
    status: row.status,
    createdAt: row.created_at
  };
}

function listPosts(userId) {
  const rows = db.prepare('SELECT * FROM content_posts WHERE user_id = ?').all(userId);
  return rows
    .map(rowToPost)
    .sort((a, b) => new Date(a.scheduledAt || a.createdAt) - new Date(b.scheduledAt || b.createdAt));
}

function getPost(userId, id) {
  const row = db.prepare('SELECT * FROM content_posts WHERE id = ? AND user_id = ?').get(id, userId);
  return row ? rowToPost(row) : null;
}

async function createPost(userId, { platform, caption, scheduledAt, media }) {
  if (!ALLOWED_PLATFORMS.includes(platform)) {
    throw new Error('منصة غير مدعومة / Unsupported platform');
  }
  if (!caption || !caption.trim()) {
    throw new Error('الرجاء إدخال نص المنشور / Please enter the post caption');
  }

  const entry = {
    id: genId(),
    userId,
    platform,
    caption: caption.trim(),
    scheduledAt: scheduledAt || null,
    media: media || null,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  db.prepare(
    'INSERT INTO content_posts (id, user_id, platform, caption, scheduled_at, media_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    entry.id,
    entry.userId,
    entry.platform,
    entry.caption,
    entry.scheduledAt,
    entry.media ? JSON.stringify(entry.media) : null,
    entry.status,
    entry.createdAt
  );

  const { userId: _userId, ...post } = entry;
  return post;
}

async function updatePost(userId, id, patch) {
  const existing = getPost(userId, id);
  if (!existing) throw new Error('المنشور غير موجود / Post not found');

  const allowedPatchKeys = ['caption', 'scheduledAt', 'status', 'platform', 'media'];
  const safePatch = {};
  for (const key of allowedPatchKeys) {
    if (key in patch) safePatch[key] = patch[key];
  }
  if (safePatch.platform && !ALLOWED_PLATFORMS.includes(safePatch.platform)) {
    throw new Error('منصة غير مدعومة / Unsupported platform');
  }
  if (safePatch.status && !['scheduled', 'posted'].includes(safePatch.status)) {
    throw new Error('حالة غير صالحة / Invalid status');
  }
  if ('caption' in safePatch && !safePatch.caption.trim()) {
    throw new Error('الرجاء إدخال نص المنشور / Please enter the post caption');
  }

  const merged = { ...existing, ...safePatch };
  db.prepare(
    'UPDATE content_posts SET platform = ?, caption = ?, scheduled_at = ?, media_json = ?, status = ? WHERE id = ? AND user_id = ?'
  ).run(
    merged.platform,
    merged.caption,
    merged.scheduledAt,
    merged.media ? JSON.stringify(merged.media) : null,
    merged.status,
    id,
    userId
  );

  return getPost(userId, id);
}

async function deletePost(userId, id) {
  const result = db.prepare('DELETE FROM content_posts WHERE id = ? AND user_id = ?').run(id, userId);
  if (result.changes === 0) throw new Error('المنشور غير موجود / Post not found');
}

module.exports = { listPosts, getPost, createPost, updatePost, deletePost, ALLOWED_PLATFORMS };

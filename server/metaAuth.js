const crypto = require('crypto');
const config = require('./config');
const { db } = require('./database');

const GRAPH_VERSION = config.META_GRAPH_VERSION;
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete the OAuth round trip

// Multiple different users can be mid-login at once, so pending OAuth states are keyed
// by state token -> which user started that login (in-memory is fine for a single Node process).
const pendingLogins = new Map();

function isConfigured() {
  return Boolean(config.META_APP_ID && config.META_APP_SECRET && config.META_REDIRECT_URI);
}

function readConnection(userId) {
  const row = db.prepare('SELECT * FROM meta_connections WHERE user_id = ?').get(userId);
  if (!row) return null;
  return { connectedAt: row.connected_at, expiresAt: row.expires_at, pages: JSON.parse(row.pages_json) };
}

function writeConnection(userId, data) {
  db.prepare(
    `INSERT INTO meta_connections (user_id, pages_json, connected_at, expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET pages_json = excluded.pages_json, connected_at = excluded.connected_at, expires_at = excluded.expires_at`
  ).run(userId, JSON.stringify(data.pages), data.connectedAt, data.expiresAt);
}

function clearConnection(userId) {
  db.prepare('DELETE FROM meta_connections WHERE user_id = ?').run(userId);
}

function startLogin(userId) {
  if (!isConfigured()) {
    throw new Error('لم يتم إعداد بيانات ربط Meta بعد، راجع ملف .env / Meta credentials are not configured — see .env');
  }

  const state = crypto.randomBytes(16).toString('hex');
  pendingLogins.set(state, { userId, expiresAt: Date.now() + STATE_TTL_MS });

  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'business_management'
  ].join(',');

  const params = new URLSearchParams({
    client_id: config.META_APP_ID,
    redirect_uri: config.META_REDIRECT_URI,
    scope,
    response_type: 'code',
    state
  });

  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet(pathname, params) {
  const res = await fetch(`${GRAPH_BASE}${pathname}?${new URLSearchParams(params).toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'طلب فشل إلى Meta / Request to Meta failed');
  }
  return data;
}

async function completeLogin(code, state) {
  const pending = pendingLogins.get(state);
  pendingLogins.delete(state);
  if (!pending || pending.expiresAt < Date.now()) {
    throw new Error('طلب دخول غير صالح أو منتهي، حاول مرة أخرى / Invalid or expired login request, please try again');
  }
  const { userId } = pending;

  const shortLived = await graphGet('/oauth/access_token', {
    client_id: config.META_APP_ID,
    client_secret: config.META_APP_SECRET,
    redirect_uri: config.META_REDIRECT_URI,
    code
  });

  const longLived = await graphGet('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: config.META_APP_ID,
    client_secret: config.META_APP_SECRET,
    fb_exchange_token: shortLived.access_token
  });

  const accountsData = await graphGet('/me/accounts', {
    fields: 'id,name,access_token,instagram_business_account',
    access_token: longLived.access_token
  });

  const pages = (accountsData.data || []).map((p) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    instagramBusinessAccountId: p.instagram_business_account?.id || null
  }));

  if (pages.length === 0) {
    throw new Error(
      'لم يتم العثور على صفحات فيسبوك مرتبطة بحسابك / No Facebook Pages were found for your account — you need to be an admin of at least one Page'
    );
  }

  const connection = {
    connectedAt: new Date().toISOString(),
    expiresAt: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000).toISOString() : null,
    pages
  };
  writeConnection(userId, connection);
  return connection;
}

function getStatus(userId) {
  const conn = readConnection(userId);
  if (!conn) return { connected: false, configured: isConfigured() };
  if (conn.expiresAt && new Date(conn.expiresAt).getTime() <= Date.now()) {
    clearConnection(userId);
    return { connected: false, configured: isConfigured(), expired: true };
  }
  return {
    connected: true,
    configured: true,
    connectedAt: conn.connectedAt,
    expiresAt: conn.expiresAt,
    pages: conn.pages.map((p) => ({ id: p.id, name: p.name, hasInstagram: Boolean(p.instagramBusinessAccountId) }))
  };
}

function getPage(userId, pageId) {
  const conn = readConnection(userId);
  if (!conn) throw new Error('لا يوجد حساب Meta متصل / No connected Meta account');
  if (conn.expiresAt && new Date(conn.expiresAt).getTime() <= Date.now()) {
    clearConnection(userId);
    throw new Error('انتهت صلاحية اتصال Meta، أعد الربط / Meta connection expired; reconnect it');
  }
  const page = (pageId ? conn.pages.find((p) => p.id === pageId) : conn.pages[0]) || conn.pages[0];
  if (!page) throw new Error('لا توجد صفحة متصلة / No connected Page');
  return page;
}

module.exports = { isConfigured, startLogin, completeLogin, getStatus, getPage, clearConnection };

const path = require('path');
const net = require('net');

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : fallback;
}

function envBool(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function envList(name) {
  return String(process.env[name] || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const DEFAULT_COUNTRY_CODE = (process.env.DEFAULT_COUNTRY_CODE || '966').replace(/\D/g, '') || '966';

// Safety floor: even a misconfigured env var cannot push delays below 2s.
const MIN_DELAY_MS = Math.max(2000, envInt('MIN_DELAY_MS', 3000));
const MAX_DELAY_MS = Math.max(MIN_DELAY_MS, envInt('MAX_DELAY_MS', 8000));
const BATCH_SIZE = Math.max(1, envInt('BATCH_SIZE', 20));
const BATCH_PAUSE_MS = Math.max(5000, envInt('BATCH_PAUSE_MS', 45000));
const PORT = envInt('PORT', 3000);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || PROJECT_ROOT);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(STORAGE_DIR, 'data'));
const SESSIONS_DIR = path.resolve(process.env.SESSIONS_DIR || path.join(STORAGE_DIR, 'sessions'));
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(STORAGE_DIR, 'uploads'));

const FRONTEND_ORIGINS = envList('FRONTEND_ORIGINS');
const PUBLIC_APP_URL = String(process.env.PUBLIC_APP_URL || FRONTEND_ORIGINS[0] || '').replace(/\/$/, '');
const CROSS_SITE_COOKIES = envBool('CROSS_SITE_COOKIES', FRONTEND_ORIGINS.length > 0);
const COOKIE_SECURE = envBool('COOKIE_SECURE');
const TRUST_PROXY = envBool('TRUST_PROXY', envBool('RENDER'));
const DISABLE_WHATSAPP = envBool('DMS_DISABLE_WHATSAPP');
const OWNER_SETUP_TOKEN = process.env.OWNER_SETUP_TOKEN || '';

// Hard cap on valid numbers per batch. Not configurable via env on purpose -
// this tool is for small-batch personal/business use, not mass messaging.
const MAX_VALID_NUMBERS = 500;

// Meta (Facebook/Instagram) app credentials for the Content Scheduler's real publish
// integration. Empty by default — the feature stays inert until you create your own
// app at developers.facebook.com and fill these in. See README for setup steps.
const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || '';
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v25.0';
if (!/^v\d+\.\d+$/.test(META_GRAPH_VERSION)) {
  throw new Error('META_GRAPH_VERSION must look like v25.0');
}
// Public HTTPS base URL for this server (e.g. an ngrok URL or real domain). Instagram's
// API must fetch the image itself, so "localhost" doesn't work for Instagram publishing;
// Facebook Page posts upload the file directly and don't need this.
const META_PUBLIC_BASE_URL = (process.env.META_PUBLIC_BASE_URL || '').replace(/\/$/, '');
if (META_PUBLIC_BASE_URL) {
  let metaPublicUrl;
  try {
    metaPublicUrl = new URL(META_PUBLIC_BASE_URL);
  } catch (err) {
    throw new Error('META_PUBLIC_BASE_URL must be a valid public HTTPS URL');
  }
  if (metaPublicUrl.protocol !== 'https:') {
    throw new Error('META_PUBLIC_BASE_URL must use HTTPS');
  }
  if (
    metaPublicUrl.origin !== META_PUBLIC_BASE_URL ||
    metaPublicUrl.username ||
    metaPublicUrl.password ||
    metaPublicUrl.search ||
    metaPublicUrl.hash
  ) {
    throw new Error('META_PUBLIC_BASE_URL must contain only the public HTTPS origin');
  }
  const host = metaPublicUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const ipv4 = net.isIP(host) === 4 ? host.split('.').map(Number) : null;
  const privateLiteral =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    (ipv4 &&
      (ipv4[0] === 10 ||
        ipv4[0] === 127 ||
        (ipv4[0] === 169 && ipv4[1] === 254) ||
        (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
        (ipv4[0] === 192 && ipv4[1] === 168))) ||
    (net.isIP(host) === 6 &&
      (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || /^fe[89ab]/.test(host)));
  if (privateLiteral) {
    throw new Error('META_PUBLIC_BASE_URL must use a publicly reachable host');
  }
}
// Signed, short-lived media URLs let Meta fetch an Instagram image without making
// the private /uploads directory public. Reuse the Meta secret unless a dedicated
// signing secret is supplied.
const MEDIA_SIGNING_SECRET = process.env.MEDIA_SIGNING_SECRET || META_APP_SECRET;

module.exports = {
  PORT,
  DATA_DIR,
  SESSIONS_DIR,
  UPLOADS_DIR,
  FRONTEND_ORIGINS,
  PUBLIC_APP_URL,
  CROSS_SITE_COOKIES,
  COOKIE_SECURE,
  TRUST_PROXY,
  DISABLE_WHATSAPP,
  OWNER_SETUP_TOKEN,
  DEFAULT_COUNTRY_CODE,
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  BATCH_SIZE,
  BATCH_PAUSE_MS,
  MAX_VALID_NUMBERS,
  META_APP_ID,
  META_APP_SECRET,
  META_REDIRECT_URI,
  META_GRAPH_VERSION,
  META_PUBLIC_BASE_URL,
  MEDIA_SIGNING_SECRET
};

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : fallback;
}

const DEFAULT_COUNTRY_CODE = (process.env.DEFAULT_COUNTRY_CODE || '966').replace(/\D/g, '') || '966';

// Safety floor: even a misconfigured env var cannot push delays below 2s.
const MIN_DELAY_MS = Math.max(2000, envInt('MIN_DELAY_MS', 3000));
const MAX_DELAY_MS = Math.max(MIN_DELAY_MS, envInt('MAX_DELAY_MS', 8000));
const BATCH_SIZE = Math.max(1, envInt('BATCH_SIZE', 20));
const BATCH_PAUSE_MS = Math.max(5000, envInt('BATCH_PAUSE_MS', 45000));
const PORT = envInt('PORT', 3000);

// Hard cap on valid numbers per batch. Not configurable via env on purpose -
// this tool is for small-batch personal/business use, not mass messaging.
const MAX_VALID_NUMBERS = 500;

// Meta (Facebook/Instagram) app credentials for the Content Scheduler's real publish
// integration. Empty by default — the feature stays inert until you create your own
// app at developers.facebook.com and fill these in. See README for setup steps.
const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || '';
// Public HTTPS base URL for this server (e.g. an ngrok URL or real domain). Instagram's
// API must fetch the image itself, so "localhost" doesn't work for Instagram publishing;
// Facebook Page posts upload the file directly and don't need this.
const META_PUBLIC_BASE_URL = (process.env.META_PUBLIC_BASE_URL || '').replace(/\/$/, '');

module.exports = {
  PORT,
  DEFAULT_COUNTRY_CODE,
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  BATCH_SIZE,
  BATCH_PAUSE_MS,
  MAX_VALID_NUMBERS,
  META_APP_ID,
  META_APP_SECRET,
  META_REDIRECT_URI,
  META_PUBLIC_BASE_URL
};

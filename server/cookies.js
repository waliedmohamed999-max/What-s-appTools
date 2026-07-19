const SESSION_COOKIE = 'session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const config = require('./config');

function cookieAttributes(maxAge, req) {
  const sameSite = config.CROSS_SITE_COOKIES ? 'None' : 'Lax';
  const secure = config.CROSS_SITE_COOKIES || config.COOKIE_SECURE || req?.secure ? '; Secure' : '';
  return `HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`;
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function setSessionCookie(res, token, req) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(MAX_AGE_SECONDS, req)}`);
}

function clearSessionCookie(res, req) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieAttributes(0, req)}`);
}

function getSessionToken(req) {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

module.exports = { setSessionCookie, clearSessionCookie, getSessionToken };

const fs = require('fs');
const path = require('path');

const rawApiBaseUrl = String(process.env.DMS_API_BASE_URL || '').trim().replace(/\/+$/, '');
let apiBaseUrl = '';

if (rawApiBaseUrl) {
  const parsed = new URL(rawApiBaseUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('DMS_API_BASE_URL must use http or https');
  }
  if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
    throw new Error('DMS_API_BASE_URL must use https outside local development');
  }
  apiBaseUrl = parsed.origin + parsed.pathname.replace(/\/+$/, '');
}

const output = `// Generated at build time. Do not put secrets in this file.\nwindow.DMS_CONFIG = Object.freeze(${JSON.stringify(
  { apiBaseUrl },
  null,
  2
)});\n`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'runtime-config.js'), output);
console.log(apiBaseUrl ? `DMS API configured: ${apiBaseUrl}` : 'DMS API uses the current origin');

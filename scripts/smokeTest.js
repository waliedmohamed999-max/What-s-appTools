const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-'));
const port = 32000 + Math.floor(Math.random() * 2000);
const baseUrl = `http://127.0.0.1:${port}`;
let output = '';

const server = spawn(process.execPath, ['server/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    STORAGE_DIR: storageDir,
    DMS_DISABLE_WHATSAPP: 'true',
    OWNER_SETUP_TOKEN: 'smoke-owner-token',
    MEDIA_SIGNING_SECRET: 'smoke-signing-secret',
    NODE_ENV: 'test'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
const serverExit = new Promise((resolve) => server.once('exit', resolve));

server.stdout.on('data', (chunk) => {
  output += chunk;
});
server.stderr.on('data', (chunk) => {
  output += chunk;
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) {
      throw new Error(`DMS exited before becoming ready (code ${server.exitCode}).\n${output}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch (error) {
      // The process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`DMS did not start in time.\n${output}`);
}

async function json(pathname, init = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, init);
  const type = res.headers.get('content-type') || '';
  assert.match(type, /application\/json/);
  return { res, body: await res.json() };
}

(async () => {
  try {
    await waitForServer();

    const health = await json('/api/health');
    assert.equal(health.res.status, 200);
    assert.equal(health.body.service, 'DMS API');

    const config = await json('/api/config');
    assert.equal(config.body.ownerSetupTokenRequired, true);

    const anonymousStatus = await json('/api/status');
    assert.equal(anonymousStatus.res.status, 401);

    const missingSetupToken = await json('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'strong-pass-123' })
    });
    assert.equal(missingSetupToken.res.status, 403);

    const register = await json('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'strong-pass-123',
        ownerSetupToken: 'smoke-owner-token'
      })
    });
    assert.equal(register.res.status, 200);
    const cookie = register.res.headers.get('set-cookie').split(';')[0];
    const authHeaders = { Cookie: cookie };

    const secondRegister = await json('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'other@example.com', password: 'strong-pass-456' })
    });
    assert.equal(secondRegister.res.status, 403);

    const status = await json('/api/status', { headers: authHeaders });
    assert.equal(status.body.status, 'disabled');

    const lists = await json('/api/contact-lists', { headers: authHeaders });
    assert.deepEqual(lists.body, []);

    const ssrf = await json('/api/store-analysis/analyze', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1' })
    });
    assert.equal(ssrf.res.status, 400);

    const unknownApi = await json('/api/not-real', { headers: authHeaders });
    assert.equal(unknownApi.res.status, 404);

    const spa = await fetch(`${baseUrl}/products`);
    assert.equal(spa.status, 200);
    assert.match(await spa.text(), /DMS/);

    const privateUpload = await json('/uploads/not-real.png');
    assert.equal(privateUpload.res.status, 401);

    const filename = 'smoke.png';
    const mediaBytes = Buffer.from('smoke-media');
    fs.writeFileSync(path.join(storageDir, 'uploads', filename), mediaBytes);
    const expires = Math.floor(Date.now() / 1000) + 60;
    const signature = crypto
      .createHmac('sha256', 'smoke-signing-secret')
      .update(`${filename}:${expires}`)
      .digest('hex');
    const publicMedia = await fetch(
      `${baseUrl}/public-media/${filename}?expires=${expires}&signature=${signature}`
    );
    assert.equal(publicMedia.status, 200);
    assert.deepEqual(Buffer.from(await publicMedia.arrayBuffer()), mediaBytes);

    const invalidPublicMedia = await json(`/public-media/${filename}?expires=${expires}&signature=${'0'.repeat(64)}`);
    assert.equal(invalidPublicMedia.res.status, 403);

    console.log('DMS smoke test passed.');
  } finally {
    if (server.exitCode === null) server.kill();
    await serverExit;
    const resolvedTemp = path.resolve(storageDir);
    if (!resolvedTemp.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
      throw new Error('Refusing to remove a directory outside the system temp folder');
    }
    fs.rmSync(resolvedTemp, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  if (output) console.error(output);
  process.exitCode = 1;
});

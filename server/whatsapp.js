const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const config = require('./config');

const SESSIONS_PATH = config.SESSIONS_DIR;

let client = null;
let shuttingDown = false;
let lifecycleQueue = Promise.resolve();
let restartTimer = null;
let restartAttempts = 0;
let restartClearsSession = false;

// status: 'disconnected' | 'qr_pending' | 'connected'
let state = { status: config.DISABLE_WHATSAPP ? 'disabled' : 'disconnected', qr: null, number: null, error: null };

function setDisconnected(error = null) {
  state = { status: 'disconnected', qr: null, number: null, error };
}

function setDisabled() {
  state = { status: 'disabled', qr: null, number: null, error: null };
}

function runLifecycle(task) {
  const operation = lifecycleQueue.then(task, task);
  lifecycleQueue = operation.catch(() => {});
  return operation;
}

function clearScheduledRestart(resetAttempts = false) {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = null;
  restartClearsSession = false;
  if (resetAttempts) restartAttempts = 0;
}

function scheduleRestart(target, reason, clearSession = false) {
  if (!target || target !== client || shuttingDown || config.DISABLE_WHATSAPP) return;
  setDisconnected(String(reason || 'Disconnected'));
  restartClearsSession = restartClearsSession || clearSession;
  if (restartTimer) return;

  const delay = Math.min(30_000, 1000 * 2 ** Math.min(restartAttempts, 5));
  restartAttempts += 1;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    const shouldClearSession = restartClearsSession;
    restartClearsSession = false;
    runLifecycle(async () => {
      if (target !== client || shuttingDown || config.DISABLE_WHATSAPP) return;
      client = null;
      await destroyClient(target);
      if (shouldClearSession) {
        try {
          await clearPersistedSession();
        } catch (err) {
          console.error('Failed to clear invalid WhatsApp session:', err.message);
        }
      }
      startClient();
    }).catch((err) => {
      console.error('WhatsApp restart failed:', err.message);
      if (!shuttingDown && !config.DISABLE_WHATSAPP) setDisconnected(err.message);
    });
  }, delay);
  restartTimer.unref();
}

async function destroyClient(target, shouldLogout = false) {
  if (!target) return;
  if (shouldLogout) {
    try {
      await target.logout();
    } catch (err) {
      /* the session or browser may already be unavailable */
    }
  }
  try {
    await target.destroy();
  } catch (err) {
    /* the browser may already be closed */
  }
}

async function clearPersistedSession() {
  const sessionsRoot = path.resolve(SESSIONS_PATH);
  const sessionPath = path.resolve(sessionsRoot, 'session');
  const relative = path.relative(sessionsRoot, sessionPath);
  if (relative !== 'session' || path.isAbsolute(relative)) {
    throw new Error('Refusing to clear a WhatsApp session outside SESSIONS_DIR');
  }
  await fs.promises.rm(sessionPath, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
}

function initializeClient(target) {
  if (!target || config.DISABLE_WHATSAPP || shuttingDown) return;
  Promise.resolve()
    .then(() => target.initialize())
    .catch((err) => {
      if (target !== client || shuttingDown) return;
      console.error('WhatsApp initialization failed:', err.message);
      scheduleRestart(target, err.message);
    });
}

function startClient() {
  if (config.DISABLE_WHATSAPP || shuttingDown) return null;
  const nextClient = buildClient();
  client = nextClient;
  initializeClient(nextClient);
  return nextClient;
}

function buildClient() {
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSIONS_PATH }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote'
      ]
    }
  });

  c.on('qr', async (qr) => {
    try {
      if (c !== client || shuttingDown) return;
      const dataUrl = await qrcode.toDataURL(qr);
      if (c !== client || shuttingDown) return;
      state = { status: 'qr_pending', qr: dataUrl, number: null, error: null };
    } catch (err) {
      console.error('Failed to render QR code:', err.message);
    }
  });

  c.on('ready', () => {
    if (c !== client || shuttingDown) return;
    clearScheduledRestart(true);
    const number = (c.info && c.info.wid && c.info.wid.user) || null;
    state = { status: 'connected', qr: null, number, error: null };
  });

  c.on('auth_failure', (msg) => {
    if (c !== client || shuttingDown) return;
    console.error('WhatsApp auth failure:', msg);
    scheduleRestart(c, String(msg || 'Authentication failed'), true);
  });

  c.on('disconnected', (reason) => {
    if (c !== client || shuttingDown) return;
    console.log('WhatsApp disconnected:', reason);
    const message = String(reason || 'Disconnected');
    scheduleRestart(c, message, /logout|unpaired/i.test(message));
  });

  return c;
}

function init() {
  if (config.DISABLE_WHATSAPP) {
    setDisabled();
    return;
  }
  shuttingDown = false;
  clearScheduledRestart(true);
  if (!client) startClient();
}

function getState() {
  return { ...state };
}

function getClient() {
  return client;
}

async function logout() {
  clearScheduledRestart(true);
  return runLifecycle(async () => {
    const target = client;
    // Detach first so a LOGOUT-triggered disconnected event is recognized as stale.
    client = null;
    await destroyClient(target, true);
    // Client.logout() can fail before LocalAuth gets a chance to remove its files.
    // Explicit logout always means a fresh QR, so remove only the exact LocalAuth session.
    await clearPersistedSession();

    if (config.DISABLE_WHATSAPP) {
      setDisabled();
      return;
    }
    setDisconnected();
    if (!shuttingDown) startClient();
  });
}

async function shutdown() {
  shuttingDown = true;
  clearScheduledRestart();
  return runLifecycle(async () => {
    const target = client;
    client = null;
    // Destroying preserves LocalAuth; logout would delete the persisted session.
    await destroyClient(target);
    if (config.DISABLE_WHATSAPP) setDisabled();
    else setDisconnected();
  });
}

module.exports = { init, getState, getClient, logout, shutdown, MessageMedia };

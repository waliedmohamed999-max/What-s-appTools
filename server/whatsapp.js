const path = require('path');
const qrcode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const SESSIONS_PATH = path.join(__dirname, '..', 'sessions');

let client = null;

// status: 'disconnected' | 'qr_pending' | 'connected'
let state = { status: 'disconnected', qr: null, number: null };

function buildClient() {
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSIONS_PATH }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  c.on('qr', async (qr) => {
    try {
      state = { status: 'qr_pending', qr: await qrcode.toDataURL(qr), number: null };
    } catch (err) {
      console.error('Failed to render QR code:', err.message);
    }
  });

  c.on('ready', () => {
    const number = (c.info && c.info.wid && c.info.wid.user) || null;
    state = { status: 'connected', qr: null, number };
  });

  c.on('auth_failure', (msg) => {
    console.error('WhatsApp auth failure:', msg);
    state = { status: 'disconnected', qr: null, number: null };
  });

  c.on('disconnected', async (reason) => {
    console.log('WhatsApp disconnected:', reason);
    state = { status: 'disconnected', qr: null, number: null };
    try {
      await c.destroy();
    } catch (err) {
      /* already gone */
    }
    client = buildClient();
    client.initialize();
  });

  return c;
}

function init() {
  client = buildClient();
  client.initialize();
}

function getState() {
  return { ...state };
}

function getClient() {
  return client;
}

async function logout() {
  if (client) {
    try {
      await client.logout();
    } catch (err) {
      /* session may already be invalid */
    }
    try {
      await client.destroy();
    } catch (err) {
      /* ignore */
    }
  }
  state = { status: 'disconnected', qr: null, number: null };
  client = buildClient();
  client.initialize();
}

module.exports = { init, getState, getClient, logout, MessageMedia };

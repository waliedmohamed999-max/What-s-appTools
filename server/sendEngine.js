const XLSX = require('xlsx');
const { MessageMedia } = require('whatsapp-web.js');
const config = require('./config');
const db = require('./db');
const whatsapp = require('./whatsapp');

function freshState() {
  return {
    running: false,
    cancelRequested: false,
    batchId: null,
    total: 0,
    processed: 0,
    sent: 0,
    failed: 0,
    notOnWhatsapp: 0,
    startedAt: null,
    finishedAt: null,
    results: []
  };
}

let state = freshState();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function interruptibleSleep(ms) {
  const deadline = Date.now() + ms;
  while (!state.cancelRequested && Date.now() < deadline) {
    await sleep(Math.min(250, deadline - Date.now()));
  }
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isRunning() {
  return state.running;
}

function getProgress() {
  const { results, ...rest } = state;
  return rest;
}

function startSend({ recipients, message, media }) {
  if (state.running) {
    throw new Error('يوجد إرسال قيد التنفيذ بالفعل / A send is already in progress');
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('لا يوجد مستلمون صالحون / No valid recipients provided');
  }
  if (recipients.length > config.MAX_VALID_NUMBERS) {
    throw new Error(
      `الحد الأقصى ${config.MAX_VALID_NUMBERS} رقم لكل عملية إرسال / Max ${config.MAX_VALID_NUMBERS} numbers per send`
    );
  }

  const waState = whatsapp.getState();
  if (waState.status !== 'connected') {
    throw new Error('واتساب غير متصل، يرجى مسح رمز QR أولاً / WhatsApp is not connected');
  }

  state = freshState();
  state.running = true;
  state.batchId = `b${Date.now()}`;
  state.total = recipients.length;
  state.startedAt = new Date().toISOString();

  runBatch(recipients, message, media).catch((err) => {
    console.error('Send batch crashed unexpectedly:', err);
    state.running = false;
    state.finishedAt = new Date().toISOString();
  });

  return { batchId: state.batchId, total: state.total };
}

function requestCancel() {
  if (state.running) state.cancelRequested = true;
}

async function runBatch(recipients, message, media) {
  const client = whatsapp.getClient();
  let messageMedia = null;
  if (media && media.path) {
    messageMedia = MessageMedia.fromFilePath(media.path);
  }

  for (let i = 0; i < recipients.length; i++) {
    if (state.cancelRequested) break;
    const r = recipients[i];

    const entry = {
      batchId: state.batchId,
      number: r.number,
      name: r.name || '',
      status: null,
      error: null,
      timestamp: new Date().toISOString()
    };

    try {
      const numberId = await client.getNumberId(r.number);
      if (!numberId) {
        entry.status = 'not_on_whatsapp';
        state.notOnWhatsapp++;
      } else {
        const personalized = String(message || '').split('{name}').join(r.name || '');
        if (messageMedia) {
          await client.sendMessage(numberId._serialized, messageMedia, { caption: personalized });
        } else {
          await client.sendMessage(numberId._serialized, personalized);
        }
        entry.status = 'sent';
        state.sent++;
      }
    } catch (err) {
      entry.status = 'failed';
      entry.error = (err && err.message) || String(err);
      state.failed++;
    }

    state.processed++;
    state.results.push(entry);
    await db.appendLog(entry);

    if (state.cancelRequested) break;

    const isLast = i === recipients.length - 1;
    if (!isLast) {
      const isBatchBoundary = (i + 1) % config.BATCH_SIZE === 0;
      const delay = isBatchBoundary
        ? config.BATCH_PAUSE_MS
        : randomBetween(config.MIN_DELAY_MS, config.MAX_DELAY_MS);
      await interruptibleSleep(delay);
    }
  }

  state.running = false;
  state.finishedAt = new Date().toISOString();
}

function getResults(batchId) {
  if (batchId && batchId !== state.batchId) return db.getLogsByBatch(batchId);
  return state.results;
}

function buildResultsWorkbook(batchId) {
  const rows = getResults(batchId);
  const data = rows.map((r) => ({
    'الرقم / Number': r.number,
    'الاسم / Name': r.name,
    'الحالة / Status': r.status,
    'الخطأ / Error': r.error || '',
    'الوقت / Timestamp': r.timestamp
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function shutdown() {
  requestCancel();
  while (state.running) await sleep(100);
}

module.exports = { startSend, requestCancel, isRunning, getProgress, getResults, buildResultsWorkbook, shutdown };

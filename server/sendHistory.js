const db = require('./db');

function listBatches() {
  const logs = db.getAllLogs();
  const byBatch = new Map();

  for (const entry of logs) {
    if (!entry.batchId) continue;
    if (!byBatch.has(entry.batchId)) {
      byBatch.set(entry.batchId, {
        batchId: entry.batchId,
        total: 0,
        sent: 0,
        failed: 0,
        notOnWhatsapp: 0,
        startedAt: entry.timestamp,
        finishedAt: entry.timestamp
      });
    }
    const b = byBatch.get(entry.batchId);
    b.total++;
    if (entry.status === 'sent') b.sent++;
    else if (entry.status === 'failed') b.failed++;
    else if (entry.status === 'not_on_whatsapp') b.notOnWhatsapp++;
    if (entry.timestamp < b.startedAt) b.startedAt = entry.timestamp;
    if (entry.timestamp > b.finishedAt) b.finishedAt = entry.timestamp;
  }

  return Array.from(byBatch.values()).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

function getFailedRecipients(batchId) {
  return db
    .getLogsByBatch(batchId)
    .filter((entry) => entry.status === 'failed')
    .map((entry) => ({ number: entry.number, name: entry.name || '' }));
}

module.exports = { listBatches, getFailedRecipients };

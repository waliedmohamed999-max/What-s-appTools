const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('logs.json');

function appendLog(entry) {
  return store.append(entry);
}

function getLogsByBatch(batchId) {
  return store.readAll().filter((l) => l.batchId === batchId);
}

function getAllLogs() {
  return store.readAll();
}

module.exports = { appendLog, getLogsByBatch, getAllLogs };

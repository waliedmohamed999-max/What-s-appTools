const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('store-analyses.json');

function genId() {
  return `a${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function findLatestByHostname(hostname) {
  const all = store.readAll().filter((entry) => entry.hostname === hostname);
  if (all.length === 0) return null;
  return all.reduce((latest, entry) => (entry.fetchedAt > latest.fetchedAt ? entry : latest));
}

async function recordAnalysis({ hostname, url, score, categoryScores, fetchedAt }) {
  const entry = { id: genId(), hostname, url, score, categoryScores, fetchedAt };
  await store.append(entry);
  return entry;
}

function listHistory(limit = 20) {
  return store
    .readAll()
    .slice()
    .sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt))
    .slice(0, limit);
}

module.exports = { recordAnalysis, listHistory, findLatestByHostname };

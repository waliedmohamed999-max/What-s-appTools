const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function createJsonStore(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]');

  // Writes are serialized through this promise chain so concurrent callers
  // never race on the file.
  let writeQueue = Promise.resolve();

  function readAll() {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    } catch (err) {
      return [];
    }
  }

  function writeAll(entries) {
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
  }

  function append(entry) {
    writeQueue = writeQueue.then(() => {
      const all = readAll();
      all.push(entry);
      writeAll(all);
      return all;
    });
    return writeQueue;
  }

  function replaceAll(entries) {
    writeQueue = writeQueue.then(() => {
      writeAll(entries);
      return entries;
    });
    return writeQueue;
  }

  return { readAll, append, replaceAll };
}

module.exports = { createJsonStore };

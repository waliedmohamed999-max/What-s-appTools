const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const DATA_DIR = config.DATA_DIR;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function createJsonStore(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) writeAll([]);

  // Writes are serialized through this promise chain so concurrent callers
  // never race on the file.
  let writeQueue = Promise.resolve();

  function readAll() {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
      if (!Array.isArray(parsed)) throw new Error('expected a JSON array');
      return parsed;
    } catch (err) {
      throw new Error(`Data store ${filename} is corrupted or unreadable: ${err.message}`);
    }
  }

  function writeAll(entries) {
    const tempPath = path.join(
      DATA_DIR,
      `.${path.basename(filename)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
    );
    let fd;
    try {
      fd = fs.openSync(tempPath, 'wx');
      fs.writeFileSync(fd, JSON.stringify(entries, null, 2));
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      if (fd !== undefined) fs.closeSync(fd);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw err;
    }
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

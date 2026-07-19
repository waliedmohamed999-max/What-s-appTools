const { createJsonStore } = require('./jsonStore');
const config = require('./config');

const store = createJsonStore('contact-lists.json');

function genId() {
  return `l${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function listLists() {
  return store
    .readAll()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createList({ name, recipients }) {
  if (!name || !name.trim()) {
    throw new Error('الرجاء إدخال اسم القائمة / Please enter a list name');
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('لا توجد أرقام لحفظها / No numbers to save');
  }

  const clean = recipients
    .map((r) => ({ number: String(r.number || '').trim(), name: String(r.name || '').trim() }))
    .filter((r) => r.number);

  if (clean.length === 0) {
    throw new Error('لا توجد أرقام صالحة لحفظها / No valid numbers to save');
  }
  if (clean.length > config.MAX_VALID_NUMBERS) {
    throw new Error(`الحد الأقصى ${config.MAX_VALID_NUMBERS} رقم لكل قائمة / Max ${config.MAX_VALID_NUMBERS} numbers per list`);
  }

  const entry = { id: genId(), name: name.trim(), recipients: clean, count: clean.length, createdAt: new Date().toISOString() };
  const all = store.readAll();
  all.push(entry);
  await store.replaceAll(all);
  return entry;
}

async function deleteList(id) {
  const all = store.readAll();
  const next = all.filter((l) => l.id !== id);
  if (next.length === all.length) throw new Error('القائمة غير موجودة / List not found');
  await store.replaceAll(next);
}

module.exports = { listLists, createList, deleteList };

const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('leads.json');
const MAX_LEN = { name: 200, phone: 40, email: 254, message: 2000 };

function genId() {
  return `lead${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function listLeads() {
  return store
    .readAll()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createLead({ name, phone, email, message }) {
  const clean = {
    name: String(name || '').trim().slice(0, MAX_LEN.name),
    phone: String(phone || '').trim().slice(0, MAX_LEN.phone),
    email: String(email || '').trim().slice(0, MAX_LEN.email),
    message: String(message || '').trim().slice(0, MAX_LEN.message)
  };

  if (!clean.name) throw new Error('الاسم مطلوب / Name is required');
  if (!clean.phone && !clean.email) {
    throw new Error('رقم الهاتف أو البريد الإلكتروني مطلوب / Phone or email is required');
  }

  const entry = { id: genId(), ...clean, createdAt: new Date().toISOString() };
  const all = store.readAll();
  all.push(entry);
  await store.replaceAll(all);
  return entry;
}

module.exports = { listLeads, createLead };

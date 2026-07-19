const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('message-templates.json');

function genId() {
  return `t${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function listTemplates() {
  return store
    .readAll()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createTemplate({ name, message, media }) {
  if (!name || !name.trim()) {
    throw new Error('الرجاء إدخال اسم القالب / Please enter a template name');
  }
  if (!message || !message.trim()) {
    throw new Error('الرجاء إدخال نص الرسالة / Please enter the message text');
  }

  const entry = {
    id: genId(),
    name: name.trim(),
    message: message.trim(),
    media: media || null,
    createdAt: new Date().toISOString()
  };

  const all = store.readAll();
  all.push(entry);
  await store.replaceAll(all);
  return entry;
}

async function deleteTemplate(id) {
  const all = store.readAll();
  const next = all.filter((t) => t.id !== id);
  if (next.length === all.length) throw new Error('القالب غير موجود / Template not found');
  await store.replaceAll(next);
}

module.exports = { listTemplates, createTemplate, deleteTemplate };

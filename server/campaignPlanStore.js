const XLSX = require('xlsx');
const { createJsonStore } = require('./jsonStore');

const store = createJsonStore('campaign-plans.json');

function genId() {
  return `c${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function listPlans() {
  return store
    .readAll()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createPlan({ name, inputs, computed }) {
  if (!name || !name.trim()) {
    throw new Error('الرجاء إدخال اسم الخطة / Please enter a plan name');
  }
  const entry = {
    id: genId(),
    name: name.trim(),
    inputs: inputs || {},
    computed: computed || {},
    createdAt: new Date().toISOString()
  };
  const all = store.readAll();
  all.push(entry);
  await store.replaceAll(all);
  return entry;
}

async function deletePlan(id) {
  const all = store.readAll();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) throw new Error('الخطة غير موجودة / Plan not found');
  await store.replaceAll(next);
}

function getPlan(id) {
  const plan = store.readAll().find((p) => p.id === id);
  if (!plan) throw new Error('الخطة غير موجودة / Plan not found');
  return plan;
}

function buildPlanWorkbook(plan) {
  const rows = (plan.computed?.rows || []).map((r) => ({
    'القناة / Channel': r.name,
    'النسبة % / Pct': r.pct,
    'الميزانية / Budget (SAR)': Math.round(r.channelBudget),
    'تكلفة النقرة / CPC': r.cpc,
    'معدل التحويل % / Conv. Rate': r.conversionRate,
    'نقرات متوقعة / Est. Clicks': Math.round(r.estimatedClicks),
    'عملاء محتملون / Est. Leads': Math.round(r.estimatedLeads),
    'تكلفة العميل / Cost per Lead': Math.round(r.costPerLead * 100) / 100,
    'الإيراد المتوقع / Est. Revenue (SAR)': Math.round(r.estimatedRevenue),
    ROAS: Math.round(r.roas * 100) / 100
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plan');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { listPlans, createPlan, deletePlan, getPlan, buildPlanWorkbook };

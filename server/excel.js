const XLSX = require('xlsx');

const PHONE_HEADERS = ['phone', 'رقم', 'mobile', 'number', 'tel', 'هاتف', 'جوال', 'رقم الجوال', 'رقم الهاتف'];
const NAME_HEADERS = ['name', 'اسم', 'الاسم', 'الإسم'];

function findColumnIndex(headerRow, candidates) {
  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] || '').trim().toLowerCase();
    if (!h) continue;
    if (candidates.some((c) => h === c.toLowerCase() || h.includes(c.toLowerCase()))) {
      return i;
    }
  }
  return -1;
}

function normalizePhone(raw, defaultCountryCode) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: false, reason: 'رقم فارغ / empty number' };
  }
  let s = String(raw).trim();
  s = s.replace(/[\s\-()]/g, '');
  s = s.replace(/^\+/, '');

  if (!/^\d+$/.test(s)) {
    return { ok: false, reason: 'يحتوي على رموز غير صحيحة / contains invalid characters' };
  }

  if (s.startsWith('0')) {
    s = String(defaultCountryCode) + s.slice(1);
  }

  if (s.length < 10 || s.length > 15) {
    return { ok: false, reason: `طول غير صحيح (${s.length} رقم) / invalid length (${s.length} digits)` };
  }

  return { ok: true, number: s };
}

function parseExcelBuffer(buffer, defaultCountryCode) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('لا توجد أوراق في الملف / No sheets found in file');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length === 0) {
    throw new Error('الملف فارغ / Empty file');
  }

  const headerRow = rows[0];
  const phoneIdx = findColumnIndex(headerRow, PHONE_HEADERS);
  const nameIdx = findColumnIndex(headerRow, NAME_HEADERS);

  if (phoneIdx === -1) {
    throw new Error('لم يتم العثور على عمود رقم الهاتف (Phone / رقم) / Phone column not found');
  }

  const validRaw = [];
  const invalid = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNum = r + 1; // 1-based, matches the row number as seen in Excel
    if (!row || row.every((c) => String(c).trim() === '')) continue;

    const rawPhone = row[phoneIdx];
    const rawName = nameIdx !== -1 ? row[nameIdx] : '';
    const result = normalizePhone(rawPhone, defaultCountryCode);

    if (result.ok) {
      validRaw.push({ number: result.number, name: String(rawName || '').trim(), row: rowNum });
    } else {
      invalid.push({ row: rowNum, value: String(rawPhone || ''), reason: result.reason });
    }
  }

  const seen = new Set();
  const valid = [];
  let duplicateCount = 0;
  for (const entry of validRaw) {
    if (seen.has(entry.number)) {
      duplicateCount++;
      continue;
    }
    seen.add(entry.number);
    valid.push(entry);
  }

  return {
    totalRows: rows.length - 1,
    validCount: valid.length,
    invalidCount: invalid.length,
    duplicateCount,
    hasNameColumn: nameIdx !== -1,
    valid,
    invalid
  };
}

module.exports = { parseExcelBuffer, normalizePhone };

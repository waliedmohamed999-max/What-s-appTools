const path = require('path');
const XLSX = require('xlsx');

const data = [
  { Name: 'أحمد علي', Phone: '0501234567' },
  { Name: 'Sara Ahmed', Phone: '966512345678' },
  { Name: 'محمد سالم', Phone: '0555555555' }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

const outPath = path.join(__dirname, '..', 'templates', 'sample-template.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Sample template written to', outPath);

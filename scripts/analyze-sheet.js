const fs = require('fs');
const content = fs.readFileSync('sheet.csv', 'utf8');

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows.filter(r => r.length > 1);
}

const rows = parseCSV(content);
const dataRows = rows.slice(1);

const stats = {
  total: dataRows.length,
  provinsi: new Set(),
  sektor: new Set(),
  sumber: new Set(),
  duplicateEmails: {},
};

const emails = {};
dataRows.forEach((r, idx) => {
  const email = (r[7] || '').trim().toLowerCase();
  if (!email) return;
  if (!emails[email]) emails[email] = [];
  emails[email].push({ row: idx + 2, name: r[1], phone: r[8] });

  stats.provinsi.add((r[3] || '').trim());
  stats.sektor.add((r[5] || '').trim());
  stats.sumber.add((r[9] || '').trim());
});

console.log('Total participants:', dataRows.length);
console.log('Unique emails:', Object.keys(emails).length);
console.log('Provinsi list:', Array.from(stats.provinsi).filter(Boolean));
console.log('Sektor Industri count:', stats.sektor.size);
console.log('Sektor list:', Array.from(stats.sektor).filter(Boolean));
console.log('Sumber informasi list:', Array.from(stats.sumber).filter(Boolean));

const duplicates = Object.entries(emails).filter(([_, list]) => list.length > 1);
console.log('Duplicate emails count:', duplicates.length);
if (duplicates.length > 0) {
  console.log('Duplicates:', JSON.stringify(duplicates, null, 2));
}


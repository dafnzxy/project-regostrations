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
console.log('Total rows (including header):', rows.length);
console.log('Total participant rows:', rows.length - 1);
console.log('Last 8 rows:');
rows.slice(-8).forEach((r, i) => {
  const rowNum = rows.length - 8 + i + 1;
  console.log(`Row ${rowNum}: ${r[0]} - ${r[1]} (${r[2]}) - ${r[7]}`);
});


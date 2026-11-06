import zlib from "zlib";

export interface ExcelColumn {
  header: string;
  width: number;
}

export interface ExcelCell {
  value: string | number;
  style?: number; // index into cellXfs in styles.xml
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  rows: (ExcelCell | null)[][];
  merges?: string[]; // e.g. ["A1:M1", "A2:M2"]
}

function escapeXml(str: string): string {
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function colIndexToLetter(index: number): string {
  let n = index + 1;
  let letter = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function buildStylesXml(): string {
  // Style indices (cellXfs):
  // 0 = Default
  // 1 = Title Banner (Bold 13pt White on #312E81 Indigo-900)
  // 2 = Subtitle Info (10pt #1E1B4B on #E0E7FF Indigo-100)
  // 3 = Table Header (Bold 10pt White on #4F46E5 Indigo-600, Bordered, Center/Left)
  // 4 = Data Cell Normal (10pt #0F172A, Bordered)
  // 5 = Data Cell Zebra Even Row (10pt #0F172A on #F8FAFC, Bordered)
  // 6 = Status Approved / Checked-In (Bold 10pt #065F46 on #D1FAE5 Emerald, Bordered, Center)
  // 7 = Status Pending (Bold 10pt #92400E on #FEF3C7 Amber, Bordered, Center)
  // 8 = Status Rejected (Bold 10pt #991B1B on #FEE2E2 Rose, Bordered, Center)
  // 9 = Center Data Cell (10pt #0F172A, Bordered, Center)
  // 10 = Bold Label Cell (Bold 10pt #1E293B on #F1F5F9, Bordered)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="7">
    <font><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF1E1B4B"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF065F46"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF92400E"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF991B1B"/><name val="Calibri"/></font>
  </fonts>
  <fills count="10">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF312E81"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE0E7FF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="11">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment vertical="center" horizontal="left"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment vertical="center" horizontal="left"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" horizontal="left" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" horizontal="left"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" horizontal="left"/>
    </xf>
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" horizontal="center"/>
    </xf>
    <xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" horizontal="center"/>
    </xf>
    <xf numFmtId="0" fontId="6" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" horizontal="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" horizontal="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" horizontal="left"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function buildWorksheetXml(sheet: ExcelSheet): string {
  const colsXml =
    sheet.columns.length > 0
      ? `<cols>${sheet.columns
          .map(
            (col, idx) =>
              `<col min="${idx + 1}" max="${idx + 1}" width="${col.width}" customWidth="1"/>`
          )
          .join("")}</cols>`
      : "";

  const rowsXml: string[] = [];

  for (let rIdx = 0; rIdx < sheet.rows.length; rIdx++) {
    const row = sheet.rows[rIdx];
    const rowNum = rIdx + 1;
    const rowHeight = rIdx === 0 ? ` ht="28" customHeight="1"` : rIdx === 3 ? ` ht="24" customHeight="1"` : ` ht="20" customHeight="1"`;

    const cellsXml: string[] = [];
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cell = row[cIdx];
      if (!cell) continue;
      const cellRef = `${colIndexToLetter(cIdx)}${rowNum}`;
      const styleAttr = cell.style !== undefined ? ` s="${cell.style}"` : "";

      if (typeof cell.value === "number" && Number.isFinite(cell.value)) {
        cellsXml.push(`<c r="${cellRef}"${styleAttr}><v>${cell.value}</v></c>`);
      } else {
        let rawStr = String(cell.value ?? "");
        // Prevent CSV/Excel Formula Injection while preserving phone numbers like +62...
        if (/^[=@\t\r]/.test(rawStr) || (/^[+-]/.test(rawStr) && !/^[+-]\d/.test(rawStr) && rawStr !== "-")) {
          rawStr = `'${rawStr}`;
        }
        const text = escapeXml(rawStr);
        cellsXml.push(
          `<c r="${cellRef}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`
        );
      }
    }

    rowsXml.push(`<row r="${rowNum}"${rowHeight}>${cellsXml.join("")}</row>`);
  }

  const mergesXml =
    sheet.merges && sheet.merges.length > 0
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
          .map((m) => `<mergeCell ref="${m}"/>`)
          .join("")}</mergeCells>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0"/>
  </sheetViews>
  ${colsXml}
  <sheetData>${rowsXml.join("")}</sheetData>
  ${mergesXml}
</worksheet>`;
}

// CRC-32 lookup table for ZIP archive creation
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBuffer(files: { name: string; content: string }[]): Buffer {
  const localFileHeaders: Buffer[] = [];
  const centralDirHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf-8");
    const uncompressedBuf = Buffer.from(file.content, "utf-8");
    const compressedBuf = zlib.deflateRawSync(uncompressedBuf);
    const fileCrc = crc32(uncompressedBuf);

    // Local file header (30 bytes + name + compressed data)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6); // general purpose bit flag
    localHeader.writeUInt16LE(8, 8); // compression method (8 = deflate)
    localHeader.writeUInt16LE(0, 10); // last mod file time
    localHeader.writeUInt16LE(0, 12); // last mod file date
    localHeader.writeUInt32LE(fileCrc, 14); // crc-32
    localHeader.writeUInt32LE(compressedBuf.length, 18); // compressed size
    localHeader.writeUInt32LE(uncompressedBuf.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    const localChunk = Buffer.concat([localHeader, nameBuf, compressedBuf]);
    localFileHeaders.push(localChunk);

    // Central directory file header (46 bytes + name)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed to extract
    centralHeader.writeUInt16LE(0, 8); // general purpose bit flag
    centralHeader.writeUInt16LE(8, 10); // compression method
    centralHeader.writeUInt16LE(0, 12); // last mod file time
    centralHeader.writeUInt16LE(0, 14); // last mod file date
    centralHeader.writeUInt32LE(fileCrc, 16); // crc-32
    centralHeader.writeUInt32LE(compressedBuf.length, 20); // compressed size
    centralHeader.writeUInt32LE(uncompressedBuf.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // file comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0, 38); // external file attributes
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header

    centralDirHeaders.push(Buffer.concat([centralHeader, nameBuf]));
    offset += localChunk.length;
  }

  const centralDirBuf = Buffer.concat(centralDirHeaders);
  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0); // signature
  endOfCentralDir.writeUInt16LE(0, 4); // number of this disk
  endOfCentralDir.writeUInt16LE(0, 6); // disk where central dir starts
  endOfCentralDir.writeUInt16LE(files.length, 8); // total entries on this disk
  endOfCentralDir.writeUInt16LE(files.length, 10); // total entries in central dir
  endOfCentralDir.writeUInt32LE(centralDirBuf.length, 12); // size of central dir
  endOfCentralDir.writeUInt32LE(offset, 16); // offset of start of central dir
  endOfCentralDir.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localFileHeaders, centralDirBuf, endOfCentralDir]);
}

export function generateXlsxBuffer(sheets: ExcelSheet[]): Buffer {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("\n  ")}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (s, i) =>
          `<sheet name="${escapeXml(
            s.name.slice(0, 31)
          )}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
      )
      .join("\n    ")}
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join("\n  ")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const files: { name: string; content: string }[] = [
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: rootRels },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/styles.xml", content: buildStylesXml() },
  ];

  sheets.forEach((sheet, idx) => {
    files.push({
      name: `xl/worksheets/sheet${idx + 1}.xml`,
      content: buildWorksheetXml(sheet),
    });
  });

  return createZipBuffer(files);
}


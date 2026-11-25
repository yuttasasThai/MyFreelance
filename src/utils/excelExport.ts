import JSZip from 'jszip';
import type { TeamRecord } from '../types.ts';

function formatThaiDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function getWorkTypeLabel(workType: TeamRecord['workType']): string {
  return workType === 'assembly' ? 'งานประกอบสินค้า' : 'งานขายสินค้า';
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colIndexToLetter(colIdx: number): string {
  let letter = '';
  let n = colIdx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function buildWorksheetXml(
  headers: string[],
  rows: Array<Array<string | number>>,
  colWidths: number[]
): string {
  const colsXml = colWidths
    .map(
      (width, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`
    )
    .join('');

  const allRows: Array<Array<string | number>> = [headers, ...rows];
  const rowsXml = allRows
    .map((row, rIdx) => {
      const rowNum = rIdx + 1;
      const isHeader = rIdx === 0;
      const cellsXml = row
        .map((cell, cIdx) => {
          const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
          if (typeof cell === 'number' && Number.isFinite(cell)) {
            return `<c r="${ref}" s="${isHeader ? 1 : 0}"><v>${cell}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr" s="${isHeader ? 1 : 0}"><is><t>${escapeXml(
            String(cell ?? '')
          )}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportRecordsToExcel(
  records: TeamRecord[],
  revision = 1,
  filenamePrefix = 'ทีมงานอิสระ_ฐานข้อมูล'
): Promise<void> {
  const dataHeaders = [
    'ลำดับ',
    'ประเภทงาน',
    'ชื่อ',
    'เบอร์โทร',
    'ตำบล',
    'อำเภอ',
    'จังหวัด',
    'วันที่บันทึก',
  ];

  const dataRows = records.map((rec, index) => [
    index + 1,
    getWorkTypeLabel(rec.workType),
    rec.name,
    rec.phone,
    rec.subdistrict,
    rec.district,
    rec.province,
    formatThaiDateTime(rec.createdAt),
  ]);

  const summaryMap: Record<
    string,
    {
      province: string;
      district: string;
      subdistrict: string;
      assembly: number;
      sales: number;
      total: number;
    }
  > = {};

  for (const rec of records) {
    const key = `${rec.province}|${rec.district}|${rec.subdistrict}`;
    if (!summaryMap[key]) {
      summaryMap[key] = {
        province: rec.province,
        district: rec.district,
        subdistrict: rec.subdistrict,
        assembly: 0,
        sales: 0,
        total: 0,
      };
    }
    if (rec.workType === 'assembly') {
      summaryMap[key].assembly += 1;
    } else {
      summaryMap[key].sales += 1;
    }
    summaryMap[key].total += 1;
  }

  const summaryHeaders = [
    'จังหวัด',
    'อำเภอ',
    'ตำบล',
    'งานประกอบสินค้า',
    'งานขายสินค้า',
    'รวมทั้งหมด',
  ];

  const summaryRows = Object.values(summaryMap)
    .sort((a, b) => b.total - a.total)
    .map((s) => [s.province, s.district, s.subdistrict, s.assembly, s.sales, s.total]);

  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="ฐานข้อมูลทีมงาน" sheetId="1" r:id="rId1"/>
    <sheet name="สรุปจำนวนตามพื้นที่" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`
  );

  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  zip.file(
    'xl/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`
  );

  zip.file(
    'xl/worksheets/sheet1.xml',
    buildWorksheetXml(dataHeaders, dataRows, [8, 20, 24, 16, 18, 18, 20, 22])
  );

  zip.file(
    'xl/worksheets/sheet2.xml',
    buildWorksheetXml(summaryHeaders, summaryRows, [20, 18, 18, 18, 16, 14])
  );

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `${filenamePrefix}_${dateStamp}_rev${revision}.xlsx`);
}

export function exportRecordsToCsv(
  records: TeamRecord[],
  revision = 1,
  filenamePrefix = 'ทีมงานอิสระ_ฐานข้อมูล'
): void {
  const headers = ['ลำดับ', 'ประเภทงาน', 'ชื่อ', 'เบอร์โทร', 'ตำบล', 'อำเภอ', 'จังหวัด', 'วันที่บันทึก'];
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(','),
    ...records.map((rec, idx) =>
      [
        idx + 1,
        getWorkTypeLabel(rec.workType),
        rec.name,
        rec.phone,
        rec.subdistrict,
        rec.district,
        rec.province,
        formatThaiDateTime(rec.createdAt),
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `${filenamePrefix}_${dateStamp}_rev${revision}.csv`);
}

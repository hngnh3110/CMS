import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { zipSync, strToU8 } from 'fflate';
import {
  parseImport,
  parseNumber,
  templateBytes,
  validatePeriod,
  MAX_FILE_BYTES,
} from '../lib/cms/importer';
import { catalog, demoBatches } from '../lib/cms/catalog';
import { dashboardPayload } from '../lib/cms/dashboard';
const options = {
  category: 'bctc' as const,
  filename: 'report.xlsx',
  period: '2026-Q2',
};
const xlsx = (rows: any[][]) => {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(rows), 'Data');
  return new Uint8Array(XLSX.write(b, { bookType: 'xlsx', type: 'array' }));
};
test('Vietnamese accounting values and strict numeric parsing', () => {
  assert.equal(parseNumber('1.234,56'), 1234.56);
  assert.equal(parseNumber('(1.200,5)'), -1200.5);
  assert.equal(parseNumber('1,234.56', 'en'), 1234.56);
  assert.equal(parseNumber('-'), 0);
  assert.throws(() => parseNumber('1.23'));
  assert.throws(() => parseNumber('12abc'));
  assert.throws(() => parseNumber(''));
});
test('All five downloadable templates can be imported', () => {
  for (const c of catalog) {
    const r = parseImport(new Uint8Array(templateBytes(c.id)), {
      ...options,
      category: c.id,
    });
    assert.equal(r.errors.length, 0, c.id);
    assert.equal(r.records.length, 1, c.id);
  }
});
test('B01 aliases and unit conversion', () => {
  const r = parseImport(
    xlsx([
      ['B01-DN'],
      ['Mã số', 'Chỉ tiêu', 'Số cuối kỳ', 'Số đầu năm'],
      ['100', 'Tài sản', 2500000000, 2000000000],
    ]),
    { ...options, sourceUnit: 'dong' },
  );
  assert.equal(r.errors.length, 0);
  assert.equal(r.records[0].closing, 2.5);
  assert.equal(r.records[0].opening, 2);
});
test('Reject duplicate codes, missing values and invalid periods', () => {
  const r = parseImport(
    xlsx([
      ['Mã số', 'Chỉ tiêu', 'Số đầu kỳ', 'Số cuối kỳ'],
      ['100', 'A', 100, 200],
      ['100', 'B', 300, 400],
      ['200', 'C', '', 400],
    ]),
    options,
  );
  assert.equal(r.errors.length, 2);
  assert.equal(r.errors[0].row, 3);
  assert.equal(validatePeriod('2026-13'), false);
  assert.throws(() =>
    parseImport(templateBytes('bctc'), { ...options, period: '2026-99' }),
  );
});
test('Formulas blocked even if cached data is present', () => {
  const b = XLSX.read(templateBytes('bctc'));
  b.Sheets[b.SheetNames[0]]['C2'] = { t: 'n', v: 3, f: '1+2' };
  assert.throws(
    () =>
      parseImport(
        new Uint8Array(XLSX.write(b, { type: 'array', bookType: 'xlsx' })),
        options,
      ),
    /công thức/,
  );
});
test('Progress totals must reconcile', () => {
  const r = parseImport(
    xlsx([
      [
        'Mã số',
        'Tên chỉ tiêu',
        'Tổng văn bản',
        'Đúng hạn',
        'Quá hạn',
        'Đang xử lý',
      ],
      ['DV1', 'A', 100, 90, 5, 10],
    ]),
    { ...options, category: 'vanban' },
  );
  assert.match(r.errors[0].message, /phải bằng/);
});
test('Multi-sheet selection is explicit', () => {
  const b = XLSX.read(templateBytes('bctc'));
  XLSX.utils.book_append_sheet(
    b,
    XLSX.utils.aoa_to_sheet([
      ['Mã số', 'Chỉ tiêu', 'Số đầu kỳ', 'Số cuối kỳ'],
      ['123', 'Other', 10, 12],
    ]),
    'Other',
  );
  const r = parseImport(
    new Uint8Array(XLSX.write(b, { type: 'array', bookType: 'xlsx' })),
    { ...options, sheet: 'Other' },
  );
  assert.equal(r.records[0].code, '123');
  assert.equal(r.warnings.length, 1);
});
test('Word B01-DN table extracts values; disallowed in other categories', () => {
  const rows = [
    ['Mã số', 'Chỉ tiêu', 'Số đầu kỳ', 'Số cuối kỳ'],
    ['100', 'Tài sản', '1.000,5', '2.000,5'],
  ];
  const xml =
    '<w:document><w:body><w:tbl>' +
    rows
      .map(
        (r) =>
          '<w:tr>' +
          r
            .map(
              (c) => '<w:tc><w:p><w:r><w:t>' + c + '</w:t></w:r></w:p></w:tc>',
            )
            .join('') +
          '</w:tr>',
      )
      .join('') +
    '</w:tbl></w:body></w:document>';
  const zip = zipSync({ 'word/document.xml': strToU8(xml) });
  const r = parseImport(zip, { ...options, filename: 'report.docx' });
  assert.equal(r.records[0].closing, 2000.5);
  assert.throws(
    () =>
      parseImport(zip, {
        ...options,
        category: 'dautu',
        filename: 'report.docx',
      }),
    /không được hỗ trợ/,
  );
});
test('Size limits and ZIP bomb preflight', () => {
  assert.throws(
    () => parseImport(new Uint8Array(MAX_FILE_BYTES + 1), options),
    /5 MB/,
  );
  const zip = zipSync({ 'huge.xml': new Uint8Array(33 * 1024 * 1024) });
  assert.throws(() => parseImport(zip, options), /32 MB/);
});
test('Financial API preserves hierarchy without double counting', () => {
  const p = dashboardPayload(demoBatches[0]);
  assert.ok('indicators' in p.summary);
  assert.equal('filename' in p, false);
  assert.equal('user_name' in p, false);
  assert.equal('source_hash' in p, false);
});
test('Numeric overflow cannot turn into JSON null', () => {
  const r = parseImport(
    xlsx([
      ['Mã số', 'Tên chỉ tiêu', 'Kế hoạch vốn', 'Đã giải ngân'],
      ['DA1', 'A', 1e308, 1e308],
    ]),
    { ...options, category: 'dautu', sourceUnit: 'ty' },
  );
  assert.equal(r.records.length, 0);
  assert.equal(r.errors.length, 1);
});
test('Forged ZIP output sizes do not bypass actual inflation limit', () => {
  const b = zipSync({ 'padding.xml': new Uint8Array(33 * 1024 * 1024) });
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (let i = 0; i < b.length - 30; i++) {
    const sig = view.getUint32(i, true);
    if (sig === 0x04034b50) view.setUint32(i + 22, 0, true);
    if (sig === 0x02014b50) view.setUint32(i + 24, 0, true);
  }
  assert.throws(() => parseImport(b, options), /32 MB|ZIP|zip|size|data/i);
});
test('Original overview template recognizes total row and does not double-count', () => {
  const r = parseImport(
    xlsx([
      ['Báo cáo tổng hợp'],
      ['Ngày thống kê 01/06/2026 - 30/06/2026'],
      [],
      ['STT', 'Đơn vị'],
      [
        '',
        '',
        'Tổng số người dùng của đơn vị',
        'Số lượng người dùng có sử dụng hệ thống',
      ],
      [1, 'Đài Truyền hình Việt Nam', 100, 40],
      [2, 'Đơn vị thử', 50, 20],
    ]),
    { ...options, category: 'eoffice' },
  );
  assert.equal(r.errors.length, 0);
  assert.equal(r.records[0].scope, 'total');
  const p = dashboardPayload({ ...demoBatches[2], records: r.records });
  assert.equal((p.summary as Record<string, number>).users, 100);
  assert.equal((p.summary as Record<string, number>).usage_rate, 40);
});
test('Original task template recognizes Vietnamese capital Đ and preserves details', () => {
  const header = Array(25).fill('');
  header[1] = 'Tên nhiệm vụ';
  header[15] = 'ID nhiệm vụ';
  const row = Array(25).fill('');
  row[0] = 1;
  row[1] = 'Nhiệm vụ thử';
  row[3] = 'Đơn vị thử';
  row[10] = 'Đã hoàn thành';
  row[15] = 'TASK01';
  row[23] = 'private@example.com';
  const r = parseImport(xlsx([header, [], row]), {
    ...options,
    category: 'nhiemvu',
  });
  assert.equal(r.errors.length, 0);
  assert.equal(r.records[0].completed, 1);
  assert.equal(r.records[0].lead_unit, 'Đơn vị thử');
  const p = dashboardPayload({ ...demoBatches[4], records: r.records });
  assert.equal('approver_email' in p.records[0], false);
});
test('Blank rows before the total do not trigger double counting', () => {
  const r = parseImport(
    xlsx([
      ['Báo cáo'],
      [],
      [],
      ['STT', 'Đơn vị'],
      ['', '', 'Tổng số người dùng của đơn vị'],
      [],
      [1, 'Đài Truyền hình Việt Nam', 10, 5],
      [2, 'Đơn vị thử', 4, 2],
    ]),
    { ...options, category: 'eoffice' },
  );
  assert.equal(r.records[0].scope, 'total');
  assert.equal(
    (
      dashboardPayload({ ...demoBatches[2], records: r.records })
        .summary as Record<string, number>
    ).users,
    10,
  );
});
test('Aggregate overflow is rejected and missing optional fields stay unknown', () => {
  const rows = [
    ['Mã số', 'Tên chỉ tiêu', 'Văn bản đến', 'Văn bản đi', 'Tổng người dùng'],
    ['A', 'A', 0, 0, Number.MAX_SAFE_INTEGER],
    ['B', 'B', 0, 0, 1],
    ['C', 'C', 0, 0, 1],
  ];
  const r = parseImport(xlsx(rows), { ...options, category: 'eoffice' });
  assert.ok(r.errors.some((e) => /Tổng/.test(e.message)));
  assert.throws(
    () => dashboardPayload({ ...demoBatches[2], records: r.records }),
    /Tổng/,
  );
  const p = dashboardPayload(demoBatches[2]);
  assert.equal((p.summary as Record<string, number | null>).usage_rate, null);
});

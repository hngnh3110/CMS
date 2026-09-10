import { checkedSum, numericTotals } from './numbers';
import * as XLSX from 'xlsx';
import { unzipSync, strFromU8, Unzip, UnzipInflate } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { catalog, type Category, type RecordRow } from './catalog';
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;
export type Column = {
  key: string;
  label: string;
  numeric?: boolean;
  optional?: boolean;
  aliases?: string[];
};
const identity: Column[] = [
  {
    key: 'code',
    label: 'Mã số',
    aliases: ['mã đơn vị', 'mã dự án', 'ma so', 'code'],
  },
  {
    key: 'name',
    label: 'Tên chỉ tiêu',
    aliases: ['tên đơn vị', 'tên dự án', 'chỉ tiêu', 'đơn vị', 'name'],
  },
];
export const columns: Record<Category, Column[]> = {
  bctc: [
    ...identity,
    {
      key: 'opening',
      label: 'Số đầu kỳ',
      numeric: true,
      aliases: ['số đầu năm', 'đầu kỳ'],
    },
    {
      key: 'closing',
      label: 'Số cuối kỳ',
      numeric: true,
      aliases: ['số cuối năm', 'cuối kỳ'],
    },
  ],
  dautu: [
    ...identity,
    { key: 'source', label: 'Nguồn vốn', optional: true },
    { key: 'planned', label: 'Kế hoạch vốn', numeric: true },
    {
      key: 'disbursed',
      label: 'Đã giải ngân',
      numeric: true,
      aliases: ['giải ngân'],
    },
  ],
  eoffice: [
    ...identity,
    { key: 'incoming', label: 'Văn bản đến', numeric: true },
    { key: 'outgoing', label: 'Văn bản đi', numeric: true },
    {
      key: 'users',
      label: 'Tổng người dùng',
      numeric: true,
      aliases: ['người dùng'],
    },
    {
      key: 'active_users',
      label: 'Người dùng hoạt động',
      numeric: true,
      optional: true,
    },
    {
      key: 'electronic_outgoing',
      label: 'Văn bản đi điện tử',
      numeric: true,
      optional: true,
    },
    { key: 'meetings', label: 'Cuộc họp', numeric: true, optional: true },
    {
      key: 'approved_meetings',
      label: 'Cuộc họp đã duyệt',
      numeric: true,
      optional: true,
    },
    { key: 'rooms', label: 'Phòng họp', numeric: true, optional: true },
  ],
  vanban: [
    ...identity,
    { key: 'total', label: 'Tổng văn bản', numeric: true },
    { key: 'ontime', label: 'Đúng hạn', numeric: true },
    { key: 'overdue', label: 'Quá hạn', numeric: true },
    { key: 'processing', label: 'Đang xử lý', numeric: true },
  ],
  nhiemvu: [
    ...identity,
    { key: 'total', label: 'Tổng nhiệm vụ', numeric: true },
    { key: 'completed', label: 'Hoàn thành', numeric: true },
    {
      key: 'overdue',
      label: 'Chậm tiến độ',
      numeric: true,
      aliases: ['quá hạn'],
    },
    { key: 'processing', label: 'Đang thực hiện', numeric: true },
  ],
};
export type ImportOptions = {
  category: Category;
  filename: string;
  period: string;
  sheet?: string;
  sourceUnit?: 'dong' | 'trieu' | 'ty';
  numberLocale?: 'vi' | 'en';
};
export type ImportResult = {
  records: RecordRow[];
  errors: { row: number; message: string }[];
  warnings: string[];
  sheets: string[];
  sheet: string;
  rowCount: number;
  unit: string;
  columns: Column[];
};
export function normalize(s: unknown) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
export function parseNumber(
  value: unknown,
  locale: 'vi' | 'en' = 'vi',
): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
      throw new Error('Số không hợp lệ hoặc vượt giới hạn');
    return value;
  }
  let s = String(value ?? '')
    .trim()
    .replace(/\s|\u00a0/g, '');
  if (s === '-' || s === '—') return 0;
  if (!s) throw new Error('Thiếu giá trị số');
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  const pattern =
    locale === 'vi'
      ? /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/
      : /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;
  if (!pattern.test(s)) throw new Error('Định dạng số không hợp lệ');
  s =
    locale === 'vi'
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  const n = Number(s) * (negative ? -1 : 1);
  if (!Number.isFinite(n) || Math.abs(n) > Number.MAX_SAFE_INTEGER)
    throw new Error('Giá trị số vượt giới hạn');
  return n;
}
export function validatePeriod(p: string) {
  return /^(?:20\d{2})(?:-Q[1-4]|-(?:0[1-9]|1[0-2]))?$/.test(p);
}
function zipPreflight(data: Uint8Array) {
  const limit = 32 * 1024 * 1024;
  let declared = 0;
  let entries = 0;
  const expected = new Map<string, number>();
  unzipSync(data, {
    filter: (f) => {
      declared += f.originalSize;
      entries++;
      if (declared > limit || entries > 2000)
        throw new Error('Tệp nén vượt giới hạn xử lý (32 MB / 2.000 mục).');
      if (expected.has(f.name)) throw new Error('Tệp nén có mục trùng tên.');
      expected.set(f.name, f.originalSize);
      return false;
    },
  });
  let actual = 0;
  let localEntries = 0;
  const finished = new Set<string>();
  const stream = new Unzip((file) => {
    localEntries++;
    if (localEntries > 2000 || !expected.has(file.name))
      throw new Error('Cấu trúc ZIP không hợp lệ.');
    let size = 0;
    file.ondata = (err, chunk, final) => {
      if (err) throw err;
      actual += chunk.length;
      size += chunk.length;
      if (actual > limit) throw new Error('Tệp nén vượt giới hạn xử lý 32 MB.');
      if (final) {
        if (size !== expected.get(file.name) || finished.has(file.name))
          throw new Error('Kích thước hoặc cấu trúc ZIP không hợp lệ.');
        finished.add(file.name);
      }
    };
    file.start();
  });
  stream.register(UnzipInflate);
  for (let i = 0; i < data.length; i += 1024)
    stream.push(data.subarray(i, i + 1024), i + 1024 >= data.length);
  if (finished.size !== expected.size)
    throw new Error('Tệp ZIP không hoàn chỉnh.');
}
function wordTables(data: Uint8Array): unknown[][] {
  const zip = unzipSync(data, {
    filter: (f) => f.name === 'word/document.xml',
  });
  if (!zip['word/document.xml'])
    throw new Error('Không tìm thấy bảng Word trong tệp.');
  const xml = strFromU8(zip['word/document.xml']);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('Tệp Word chứa khai báo không được hỗ trợ.');
  const tree = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: true,
    parseTagValue: false,
    processEntities: false,
  }).parse(xml);
  const find = (nodes: any[], tag: string): any[] =>
    nodes.flatMap((n) =>
      Object.entries(n).flatMap(([k, v]) =>
        k === tag ? [v] : Array.isArray(v) ? find(v, tag) : [],
      ),
    );
  const text = (nodes: any[]): string =>
    nodes
      .map((n) =>
        Object.entries(n)
          .map(([k, v]) =>
            k === '#text' ? String(v) : Array.isArray(v) ? text(v) : '',
          )
          .join(''),
      )
      .join('');
  return find(tree, 'w:tr').map((tr) =>
    find(tr, 'w:tc').map((cell) => text(cell).trim()),
  );
}
export function parseImport(
  data: Uint8Array,
  options: ImportOptions,
): ImportResult {
  const cat = catalog.find((c) => c.id === options.category);
  if (!cat) throw new Error('Chuyên mục không hợp lệ.');
  if (!validatePeriod(options.period))
    throw new Error('Kỳ báo cáo phải có dạng 2026, 2026-08 hoặc 2026-Q2.');
  if (!data.length || data.length > MAX_FILE_BYTES)
    throw new Error('Tệp phải có dung lượng từ 1 byte đến 5 MB.');
  const ext = options.filename.split('.').pop()?.toLowerCase();
  if (
    !['xlsx', 'xls', 'csv', 'docx'].includes(ext || '') ||
    (ext === 'docx' && options.category !== 'bctc')
  )
    throw new Error('Định dạng tệp không được hỗ trợ cho chuyên mục này.');
  if (
    options.sourceUnit &&
    !['dong', 'trieu', 'ty'].includes(options.sourceUnit)
  )
    throw new Error('Đơn vị nguồn không hợp lệ.');
  if (options.numberLocale && !['vi', 'en'].includes(options.numberLocale))
    throw new Error('Quy ước số không hợp lệ.');
  if (data[0] === 0x50 && data[1] === 0x4b) zipPreflight(data);
  let grid: unknown[][] = [];
  let sheets: string[] = [];
  let sheet = '';
  if (ext === 'docx') {
    grid = wordTables(data);
    sheets = ['Bảng Word'];
    sheet = sheets[0];
  } else {
    const book = XLSX.read(data, {
      type: 'array',
      cellDates: false,
      cellFormula: true,
      sheetRows: MAX_ROWS + 52,
      raw: true,
    });
    sheets = book.SheetNames;
    if (!sheets.length) throw new Error('Tệp không có trang tính.');
    sheet = options.sheet || sheets[0];
    if (!sheets.includes(sheet)) throw new Error('Trang tính không tồn tại.');
    const ws = book.Sheets[sheet];
    const range = XLSX.utils.decode_range(ws['!fullref'] || ws['!ref'] || 'A1');
    if (range.e.r > MAX_ROWS + 50 || range.e.c > 100)
      throw new Error('Tệp vượt giới hạn 5.000 dòng hoặc 100 cột.');
    for (const [key, cell] of Object.entries(ws)) {
      if (!key.startsWith('!') && (cell as any)?.f)
        throw new Error(
          'Tệp chứa công thức. Hãy dán thành giá trị trước khi nhập để tránh dùng kết quả tính cũ.',
        );
    }
    grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  }
  const legacy = parseLegacyGrid(grid, options, {
    sheets,
    sheet,
    unit: cat.unit,
  });
  if (legacy) return legacy;
  const cols = columns[options.category];
  let headerIndex = -1;
  let mapping: number[] = [];
  for (let i = 0; i < Math.min(grid.length, 50); i++) {
    const cells = grid[i].map(normalize);
    const map = cols.map((c) =>
      cells.findIndex((cell) =>
        [c.key, c.label, ...(c.aliases || [])].map(normalize).includes(cell),
      ),
    );
    if (cols.every((c, j) => c.optional || map[j] !== -1)) {
      headerIndex = i;
      mapping = map;
      break;
    }
  }
  if (headerIndex < 0)
    throw new Error(
      'Không tìm thấy hàng tiêu đề phù hợp. Tải tệp mẫu hoặc đổi tên cột: ' +
        cols
          .filter((c) => !c.optional)
          .map((c) => c.label)
          .join(', ') +
        '.',
    );
  const errors: { row: number; message: string }[] = [];
  const records: RecordRow[] = [];
  const seen = new Set<string>();
  const isMoney = ['bctc', 'dautu'].includes(options.category);
  const sourceUnit =
    options.sourceUnit || (options.category === 'bctc' ? 'ty' : 'trieu');
  const scale = isMoney
    ? { dong: 1, trieu: 1e6, ty: 1e9 }[sourceUnit] /
      (options.category === 'bctc' ? 1e9 : 1e6)
    : 1;
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i];
    if (cells.every((c) => c === '' || c === null)) continue;
    const row: RecordRow = {};
    const rowErrors: string[] = [];
    for (let j = 0; j < cols.length; j++) {
      const c = cols[j];
      const v = cells[mapping[j]];
      if ((v === undefined || v === null || v === '') && c.optional) {
        row[c.key] = c.numeric ? null : '';
        continue;
      }
      try {
        if (c.numeric) {
          const n = parseNumber(v, options.numberLocale || 'vi');
          if (!isMoney && (n < 0 || !Number.isInteger(n)))
            throw new Error('Phải là số nguyên không âm');
          if (options.category === 'dautu' && n < 0)
            throw new Error('Không được âm');
          const scaled = n * scale;
          if (
            !Number.isFinite(scaled) ||
            Math.abs(scaled) > Number.MAX_SAFE_INTEGER
          )
            throw new Error('Giá trị sau quy đổi vượt giới hạn');
          row[c.key] = scaled;
        } else {
          const value = String(v ?? '').trim();
          if (!value && !c.optional) throw new Error('Thiếu giá trị');
          if (value.length > 2000) throw new Error('Nội dung quá dài');
          row[c.key] = value;
        }
      } catch (e) {
        rowErrors.push(`${c.label}: ${(e as Error).message}`);
      }
    }
    if (row.code && seen.has(String(row.code)))
      rowErrors.push('Mã số trùng trong tệp');
    seen.add(String(row.code));
    if (
      options.category === 'dautu' &&
      Number(row.disbursed) > Number(row.planned)
    )
      rowErrors.push('Giải ngân lớn hơn kế hoạch vốn');
    if (
      options.category === 'eoffice' &&
      row.active_users != null &&
      Number(row.active_users) > Number(row.users)
    )
      rowErrors.push('Người dùng hoạt động lớn hơn tổng người dùng');
    if (
      options.category === 'eoffice' &&
      row.electronic_outgoing != null &&
      Number(row.electronic_outgoing) > Number(row.outgoing)
    )
      rowErrors.push('Văn bản đi điện tử lớn hơn tổng văn bản đi');
    if (
      options.category === 'eoffice' &&
      row.approved_meetings != null &&
      row.meetings != null &&
      Number(row.approved_meetings) > Number(row.meetings)
    )
      rowErrors.push('Cuộc họp đã duyệt lớn hơn tổng cuộc họp');
    if (
      options.category === 'vanban' &&
      Number(row.ontime) + Number(row.overdue) + Number(row.processing) !==
        Number(row.total)
    )
      rowErrors.push('Đúng hạn + quá hạn + đang xử lý phải bằng tổng văn bản');
    if (
      options.category === 'nhiemvu' &&
      Number(row.completed) + Number(row.overdue) + Number(row.processing) !==
        Number(row.total)
    )
      rowErrors.push(
        'Hoàn thành + chậm tiến độ + đang thực hiện phải bằng tổng nhiệm vụ',
      );
    if (rowErrors.length)
      errors.push({ row: i + 1, message: rowErrors.join('; ') });
    else records.push(row);
  }
  if (!records.length && !errors.length)
    errors.push({ row: headerIndex + 2, message: 'Không có dòng dữ liệu.' });
  if (records.length + errors.length > MAX_ROWS)
    throw new Error('Tối đa 5.000 dòng dữ liệu mỗi tệp.');
  if (options.category !== 'bctc')
    try {
      numericTotals(records);
    } catch (e) {
      errors.push({ row: headerIndex + 1, message: (e as Error).message });
    }
  return {
    records,
    errors,
    warnings:
      sheets.length > 1
        ? [`Tệp có ${sheets.length} trang tính. Chỉ nhập trang “${sheet}”.`]
        : [],
    sheets,
    sheet,
    rowCount: records.length + errors.length,
    unit: cat.unit,
    columns: cols,
  };
}
export function templateBytes(category: Category) {
  const cols = columns[category];
  const example = cols.map((c) =>
    c.key === 'code'
      ? 'MA01'
      : c.key === 'name'
        ? 'Đơn vị / chỉ tiêu minh họa'
        : c.key === 'source'
          ? 'Ngân sách'
          : c.numeric
            ? 0
            : '',
  );
  const book = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.label), example]);
  ws['!cols'] = cols.map((c) => ({ wch: c.numeric ? 22 : 35 }));
  XLSX.utils.book_append_sheet(book, ws, 'Du lieu');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' });
}

/** Adapters for the three templates downloaded from the existing Dashboard on 2026-09-10. */
function parseLegacyGrid(
  grid: unknown[][],
  options: ImportOptions,
  meta: { sheets: string[]; sheet: string; unit: string },
): ImportResult | null {
  const category = options.category;
  let header = -1;
  let start = -1;
  let fields: string[] = [];
  if (category === 'eoffice') {
    header = grid.findIndex(
      (r) => normalize(r[2]) === 'tong so nguoi dung cua don vi',
    );
    fields = [
      'source_stt',
      'name',
      'users',
      'active_users',
      'total_visits',
      'source_average_visits',
      'source_usage_rate',
      'incoming',
      'incoming_internal',
      'incoming_interconnected',
      'incoming_paper',
      'outgoing',
      'electronic_outgoing',
      'outgoing_paper',
      'outgoing_interconnected',
      'source_electronic_outgoing_rate',
      'tasks_assigned_units',
      'tasks_assigned_people',
      'tasks_performed_units',
      'tasks_performed_people',
      'source_task_unit_completion_rate',
      'source_task_person_completion_rate',
      'rooms',
      'meetings',
      'approved_meetings',
    ];
    start = header + 1;
  }
  if (category === 'vanban') {
    header = grid.findIndex(
      (r) =>
        normalize(r[2]) === 'tong so' &&
        normalize(r[3]) === 'hoan thanh dung han' &&
        normalize(r[7]) === 'tong so',
    );
    fields = [
      'source_stt',
      'name',
      ...['incoming', 'outgoing', 'submissions', 'dossiers'].flatMap((prefix) =>
        [
          'total',
          'completed_ontime',
          'pending_ontime',
          'completed_overdue',
          'pending_overdue',
        ].map((k) => prefix + '_' + k),
      ),
    ];
    start = header + 1;
  }
  if (category === 'nhiemvu') {
    header = grid.findIndex(
      (r) =>
        normalize(r[1]) === 'ten nhiem vu' &&
        normalize(r[15]) === 'id nhiem vu',
    );
    fields = [
      'source_stt',
      'name',
      'chairperson',
      'lead_unit',
      'partner_units',
      'contact_unit',
      'start_date',
      'due_date',
      'task_type',
      'source',
      'task_status',
      'result',
      'completion_level',
      'difficulties',
      'proposals',
      'code',
      'assigned_by',
      'implementation_plan',
      'updated_date',
      'actual_completion_date',
      'extension_count',
      'previous_deadline',
      'approver_name',
      'approver_email',
      'approver_phone',
    ];
    start = header + 2;
  }
  if (header < 0) return null;
  const range =
    grid
      .slice(0, header)
      .flat()
      .map((v) => String(v ?? ''))
      .find((v) => /ngày thống kê|đến ngày|ngày báo cáo/i.test(v)) || '';
  const errors: { row: number; message: string }[] = [];
  const records: RecordRow[] = [];
  const seen = new Set<string>();
  const warnings = [
    'Đã nhận diện mẫu từ Dashboard hiện có. Giữ nguyên các cột chi tiết trong dữ liệu.',
    'Trong mẫu Dashboard hiện có, ô số trống được hiểu là 0.',
  ];
  if (range) warnings.push(range);
  const number = (v: unknown) => parseNumber(v, options.numberLocale || 'vi');
  let ordinal = 0;
  for (let i = start; i < grid.length; i++) {
    const cells = grid[i];
    if (
      cells.every(
        (v) => v === null || v === undefined || String(v).trim() === '',
      )
    )
      continue;
    const row: RecordRow = {};
    const isFirstData = ordinal++ === 0;
    const issues: string[] = [];
    for (let j = 0; j < fields.length; j++) {
      const k = fields[j],
        v = cells[j];
      const text = String(v ?? '').trim();
      const numeric =
        category === 'eoffice'
          ? j >= 2 && !k.startsWith('source_')
          : category === 'vanban'
            ? j >= 2
            : k === 'extension_count';
      if (numeric) {
        try {
          const n = text === '' ? 0 : number(v);
          if (n < 0 || !Number.isInteger(n))
            throw Error('Phải là số nguyên không âm');
          row[k] = n;
        } catch (e) {
          issues.push(k + ': ' + (e as Error).message);
        }
      } else {
        if (text.length > 2000) issues.push(k + ': nội dung quá dài');
        row[k] = text;
      }
    }
    if (!row.name) issues.push('Thiếu tên đơn vị / nhiệm vụ');
    if (category !== 'nhiemvu')
      row.code = normalize(row.name)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    if (!row.code) issues.push('Thiếu ID nhiệm vụ / mã đơn vị');
    if (seen.has(String(row.code))) issues.push('Mã số trùng trong tệp');
    seen.add(String(row.code));
    row.scope =
      category === 'nhiemvu'
        ? 'task'
        : isFirstData &&
            String(row.source_stt) === '1' &&
            normalize(row.name) === 'dai truyen hinh viet nam'
          ? 'total'
          : 'unit';
    row.source_reporting_range = range;
    if (category === 'eoffice') {
      if (Number(row.active_users) > Number(row.users))
        issues.push('Người dùng hoạt động lớn hơn tổng người dùng');
      row.usage_rate = Number(row.users)
        ? (Number(row.active_users) / Number(row.users)) * 100
        : 0;
      row.electronic_outgoing_rate = Number(row.outgoing)
        ? (Number(row.electronic_outgoing) / Number(row.outgoing)) * 100
        : 0;
    }
    if (category === 'vanban') {
      row.total = Number(row.incoming_total);
      row.ontime = Number(row.incoming_completed_ontime);
      try {
        row.overdue = checkedSum([
          Number(row.incoming_completed_overdue),
          Number(row.incoming_pending_overdue),
        ]);
      } catch (e) {
        issues.push((e as Error).message);
      }
      row.processing = Number(row.incoming_pending_ontime);
      // Original KPI groups are preserved independently. Do not silently sum unlike categories.
      for (const prefix of [
        'incoming',
        'outgoing',
        'submissions',
        'dossiers',
      ]) {
        const total = Number(row[prefix + '_total']);
        const sum = [
          'completed_ontime',
          'pending_ontime',
          'completed_overdue',
          'pending_overdue',
        ].reduce((n, k) => n + Number(row[prefix + '_' + k]), 0);
        if (sum !== total)
          warnings.push(
            'Dòng ' +
              (i + 1) +
              ': ' +
              prefix +
              ' không khớp tổng phân loại; giữ số liệu nguồn để kiểm tra.',
          );
      }
    }
    if (category === 'nhiemvu') {
      const status = normalize(row.task_status);
      const level = normalize(row.completion_level);
      row.total = 1;
      row.completed = 0;
      row.overdue = 0;
      row.processing = 0;
      if (['da hoan thanh', 'hoan thanh'].includes(status)) row.completed = 1;
      else if (/cham tien do|qua han/.test(status + ' ' + level))
        row.overdue = 1;
      else if (
        [
          'dang thuc hien',
          'chua thuc hien',
          'chua hoan thanh',
          'dang xu ly',
          'moi tao',
          'da giao',
        ].includes(status)
      )
        row.processing = 1;
      else
        issues.push(
          'Trạng thái nhiệm vụ chưa nhận diện: ' + String(row.task_status),
        );
    }
    if (issues.length) errors.push({ row: i + 1, message: issues.join('; ') });
    else records.push(row);
  }
  if (!records.length && !errors.length)
    errors.push({ row: start + 1, message: 'Không có dòng dữ liệu.' });
  if (records.length + errors.length > MAX_ROWS)
    throw Error('Tối đa 5.000 dòng dữ liệu mỗi tệp.');
  if (category !== 'nhiemvu' && records.some((r) => r.scope === 'total'))
    warnings.push(
      'API ưu tiên dòng toàn Đài để tổng hợp; không cộng lại với các dòng đơn vị.',
    );
  try {
    numericTotals(records);
  } catch (e) {
    errors.push({ row: header + 1, message: (e as Error).message });
  }
  return {
    ...meta,
    records,
    errors,
    warnings: [...new Set(warnings)].slice(0, 30),
    rowCount: records.length + errors.length,
    columns: columns[category],
  };
}

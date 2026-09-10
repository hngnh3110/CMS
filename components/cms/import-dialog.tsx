'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  ArrowRight,
  AlertCircle,
  LoaderCircle,
  ChevronLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  catalog,
  type Category,
  type Batch,
  type RequestFn,
} from '@/lib/cms/catalog';
import {
  parseImport,
  templateBytes,
  MAX_FILE_BYTES,
  validatePeriod,
  type ImportResult,
} from '@/lib/cms/importer';
export function downloadBlob(
  bytes: BlobPart,
  filename: string,
  type = 'application/octet-stream',
) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Picker({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger className="cms-select" aria-label={label}>
        <SelectValue>
          {options.find((o) => o.value === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
const base64 = (bytes: Uint8Array) => {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
};
export default function ImportDialog({
  open,
  onClose,
  initialCategory,
  request,
  onSaved,
  allowedCategories,
}: {
  open: boolean;
  onClose: () => void;
  initialCategory?: Category;
  request?: RequestFn;
  onSaved: (b: Batch) => void;
  allowedCategories?: string[];
}) {
  const [category, setCategory] = useState<Category>('bctc');
  const [period, setPeriod] = useState('2026-09');
  const [unit, setUnit] = useState('ty');
  const [locale, setLocale] = useState('vi');
  const [sheet, setSheet] = useState('');
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<ImportResult>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [notes, setNotes] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      const c =
        initialCategory || (allowedCategories?.[0] as Category) || 'bctc';
      setCategory(c);
      setPeriod(
        new Date()
          .toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
          .slice(0, 7),
      );
      setUnit(c === 'bctc' ? 'ty' : 'trieu');
      setFile(undefined);
      setResult(undefined);
      setError('');
      setStep(1);
      setSheet('');
      setNotes('');
    }
  }, [open, initialCategory]);
  const cat = catalog.find((c) => c.id === category)!;
  const options = {
    category,
    filename: file?.name || '',
    period,
    sourceUnit: unit as 'ty' | 'trieu' | 'dong',
    numberLocale: locale as 'vi' | 'en',
    sheet: sheet || undefined,
  };
  async function choose(f?: File) {
    setResult(undefined);
    setStep(1);
    setError('');
    setSheet('');
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError('Tệp lớn hơn 5 MB. Hãy chia nhỏ dữ liệu.');
      return;
    }
    setFile(f);
  }
  async function inspect() {
    if (!file) return;
    if (!validatePeriod(period)) {
      setError('Nhập kỳ theo dạng 2026-09, 2026-Q3 hoặc 2026.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const r = request
        ? (
            await request('/vtv/preview', {
              method: 'POST',
              body: { ...options, content: base64(bytes) },
            })
          ).data
        : parseImport(bytes, options);
      setResult(r);
      setSheet(r.sheet);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!file || !result || result.errors.length) return;
    setBusy(true);
    setError('');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let batch: Batch;
      if (request) {
        batch = (
          await request('/vtv/imports', {
            method: 'POST',
            body: { ...options, notes, content: base64(bytes) },
          })
        ).data;
      } else {
        const checked = parseImport(bytes, options);
        if (checked.errors.length) throw Error('Tệp còn lỗi.');
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
        )
          .map((n) => n.toString(16).padStart(2, '0'))
          .join('');
        batch = {
          id: crypto.randomUUID(),
          category,
          filename: file.name,
          period,
          status: 'draft',
          records: checked.records,
          row_count: checked.records.length,
          date_created: new Date().toISOString(),
          user_name: 'Người nhập mẫu',
          notes,
          source_hash: hash,
        };
      }
      onSaved(batch);
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="vtv-dialog">
        <DialogHeader>
          <DialogTitle>Nhập dữ liệu mới</DialogTitle>
          <DialogDescription>
            {request
              ? 'Tệp gốc và dữ liệu sẽ được lưu trong Directus.'
              : 'Xem trước luồng nhập · Tệp chỉ được xử lý trong trình duyệt.'}
          </DialogDescription>
        </DialogHeader>
        <div className="import-steps">
          {['Chọn tệp', 'Kiểm tra dữ liệu', 'Lưu bản nháp'].map((s, i) => (
            <div key={s} className={step >= i + 1 ? 'current' : ''}>
              <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
              {s}
              {i < 2 && <ArrowRight size={14} />}
            </div>
          ))}
        </div>
        {step < 3 && (
          <>
            <div className="form-grid">
              <label>
                Chuyên mục
                <Picker
                  label="Chuyên mục nhập"
                  value={category}
                  onChange={(c) => {
                    setCategory(c as Category);
                    setUnit(c === 'bctc' ? 'ty' : 'trieu');
                    setResult(undefined);
                    setStep(1);
                    setSheet('');
                  }}
                  options={catalog
                    .filter(
                      (c) =>
                        !allowedCategories || allowedCategories.includes(c.id),
                    )
                    .map((c) => ({ value: c.id, label: c.name }))}
                />
              </label>
              <label>
                Kỳ báo cáo
                <input
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setResult(undefined);
                    setStep(1);
                  }}
                  placeholder="2026-09 hoặc 2026-Q3"
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Quy ước số trong ô văn bản
                <Picker
                  label="Quy ước số"
                  value={locale}
                  onChange={(v) => {
                    setLocale(v);
                    setResult(undefined);
                    setStep(1);
                  }}
                  options={[
                    { value: 'vi', label: 'Việt Nam · 1.234,56' },
                    { value: 'en', label: 'Quốc tế · 1,234.56' },
                  ]}
                />
              </label>
              {['bctc', 'dautu'].includes(category) && (
                <label>
                  Đơn vị tiền trong tệp
                  <Picker
                    label="Đơn vị nguồn"
                    value={unit}
                    onChange={(v) => {
                      setUnit(v);
                      setResult(undefined);
                      setStep(1);
                    }}
                    options={[
                      { value: 'dong', label: 'Đồng' },
                      { value: 'trieu', label: 'Triệu đồng' },
                      { value: 'ty', label: 'Tỷ đồng' },
                    ]}
                  />
                </label>
              )}
            </div>
            {step === 1 && (
              <>
                <div
                  className="upload-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void choose(e.dataTransfer.files[0]);
                  }}
                >
                  <Upload size={31} />
                  <h3>{file ? file.name : 'Kéo thả tệp vào đây'}</h3>
                  <p>
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : cat.formats + ' · Tối đa 5 MB'}
                  </p>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => input.current?.click()}
                  >
                    {file ? 'Chọn tệp khác' : 'Chọn tệp từ máy tính'}
                  </button>
                  <input
                    ref={input}
                    type="file"
                    hidden
                    accept={cat.formats.replace(/ /g, '')}
                    onChange={(e) => void choose(e.target.files?.[0])}
                  />
                </div>
                <button
                  type="button"
                  className="template-download"
                  onClick={() =>
                    downloadBlob(
                      templateBytes(category),
                      `Mau_${category}.xlsx`,
                    )
                  }
                >
                  <Download size={17} /> Tải mẫu {cat.name}{' '}
                  <span>Excel (.xlsx)</span>
                </button>
                <p className="form-hint">
                  Dùng tệp mẫu để khớp tên cột. Tệp hiện có cần có hàng tiêu đề
                  tương ứng; không nhập ô chứa công thức.
                </p>
              </>
            )}
            {result && step === 2 && (
              <>
                <div className="inspection-summary">
                  <span>
                    <strong>{result.rowCount}</strong> dòng dữ liệu
                  </span>
                  <span className="good">
                    <strong>{result.records.length}</strong> hợp lệ
                  </span>
                  <span className={result.errors.length ? 'bad' : ''}>
                    <strong>{result.errors.length}</strong> lỗi
                  </span>
                  <small>Đơn vị: {result.unit}</small>
                </div>
                {result.sheets.length > 1 && (
                  <label className="block-label">
                    Trang tính đang nhập
                    <Picker
                      label="Trang tính"
                      value={sheet}
                      options={result.sheets.map((s) => ({
                        value: s,
                        label: s,
                      }))}
                      onChange={(v) => {
                        setSheet(v);
                        setResult(undefined);
                        setStep(1);
                      }}
                    />
                  </label>
                )}
                {result.errors.length > 0 && (
                  <div className="validation-errors" role="alert">
                    <strong>Cần sửa tệp trước khi lưu</strong>
                    {result.errors.slice(0, 20).map((e) => (
                      <p key={e.row}>
                        Dòng {e.row}: {e.message}
                      </p>
                    ))}
                    {result.errors.length > 20 && (
                      <p>Và {result.errors.length - 20} dòng lỗi khác.</p>
                    )}
                  </div>
                )}
                {result.warnings.map((w) => (
                  <p key={w} className="form-hint">
                    {w}
                  </p>
                ))}
                <div className="preview-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {result.columns.map((c) => (
                          <TableHead key={c.key}>{c.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.records.slice(0, 8).map((r, i) => (
                        <TableRow key={i}>
                          {result.columns.map((c) => (
                            <TableCell key={c.key}>
                              {r[c.key] === null
                                ? '—'
                                : typeof r[c.key] === 'number'
                                  ? Number(r[c.key]).toLocaleString('vi-VN')
                                  : r[c.key]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="form-hint">
                  Hiển thị tối đa 8 dòng đầu.{' '}
                  {result.errors.length
                    ? 'Tải lại tệp sau khi sửa lỗi.'
                    : 'Bản nháp chưa được cung cấp qua API Dashboard.'}
                </p>
                <label className="block-label">
                  Ghi chú phiên bản
                  <textarea
                    value={notes}
                    maxLength={2000}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Nội dung cập nhật, nguồn dữ liệu…"
                  />
                </label>
              </>
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <div className="dialog-actions">
              {step === 2 ? (
                <button
                  disabled={busy}
                  className="secondary-btn"
                  onClick={() => {
                    setStep(1);
                    setResult(undefined);
                  }}
                >
                  <ChevronLeft size={16} />
                  Chọn lại tệp
                </button>
              ) : (
                <button
                  disabled={busy}
                  className="secondary-btn"
                  onClick={onClose}
                >
                  Hủy
                </button>
              )}
              <button
                className="primary-btn"
                disabled={
                  busy || !file || (step === 2 && !!result?.errors.length)
                }
                onClick={step === 1 ? inspect : save}
              >
                {busy ? (
                  <LoaderCircle size={16} className="spinning" />
                ) : step === 1 ? (
                  <ArrowRight size={16} />
                ) : (
                  <Check size={16} />
                )}{' '}
                {busy
                  ? 'Đang xử lý…'
                  : step === 1
                    ? 'Kiểm tra dữ liệu'
                    : 'Lưu bản nháp'}
              </button>
            </div>
          </>
        )}
        {step === 3 && (
          <div className="import-success">
            <div>
              <Check size={32} />
            </div>
            <h3>Đã lưu bản nháp</h3>
            <p>
              {result?.records.length} dòng dữ liệu · {cat.name} · {period}
            </p>
            <p>
              Người có quyền công bố có thể kiểm tra và phát hành phiên bản này.
            </p>
            <button className="primary-btn" onClick={onClose}>
              Hoàn tất
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

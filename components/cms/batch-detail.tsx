'use client';
import { useState } from 'react';
import {
  Download,
  Check,
  RotateCcw,
  FileText,
  LoaderCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { type Batch, catalog } from '@/lib/cms/catalog';
import { columns } from '@/lib/cms/importer';
import { dashboardPayload } from '@/lib/cms/dashboard';
import { downloadBlob } from './import-dialog';
export default function BatchDetail({
  batch,
  onClose,
  onPublish,
  canPublish,
}: {
  batch: Batch | null;
  onClose: () => void;
  onPublish: (b: Batch) => Promise<void>;
  canPublish: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!batch) return null;
  const published = batch.status === 'published';
  const action =
    batch.status === 'archived' ? 'Khôi phục và công bố' : 'Công bố phiên bản';
  return (
    <Dialog
      open={!!batch}
      onOpenChange={(v) => {
        if (!v && !busy) {
          setConfirm(false);
          setError('');
          onClose();
        }
      }}
    >
      <DialogContent className="vtv-dialog batch-dialog">
        <DialogHeader>
          <DialogTitle>Chi tiết phiên bản</DialogTitle>
          <DialogDescription>
            {catalog.find((c) => c.id === batch.category)?.name} ·{' '}
            {batch.period}
          </DialogDescription>
        </DialogHeader>
        <div className="detail-file">
          <FileText size={24} />
          <div>
            <strong>{batch.filename}</strong>
            <small>
              {batch.row_count} dòng · {batch.user_name} ·{' '}
              {new Date(batch.date_created).toLocaleString('vi-VN')}
            </small>
          </div>
          <span className={`status-badge ${batch.status}`}>
            {published
              ? 'Đã công bố'
              : batch.status === 'draft'
                ? 'Bản nháp'
                : 'Lưu trữ'}
          </span>
        </div>
        <Tabs defaultValue="data">
          <TabsList>
            <TabsTrigger value="data">Dữ liệu</TabsTrigger>
            <TabsTrigger value="api">Dạng API</TabsTrigger>
          </TabsList>
          <TabsContent value="data">
            <div className="preview-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns[batch.category].map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(batch.records || []).slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      {columns[batch.category].map((c) => (
                        <TableCell key={c.key}>
                          {r[c.key] === null || r[c.key] === undefined
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
              Hiển thị tối đa 50 dòng. Xuất JSON để lấy toàn bộ dữ liệu.
            </p>
          </TabsContent>
          <TabsContent value="api">
            <p className="form-hint">
              {published
                ? 'Dữ liệu của phiên bản đã công bố.'
                : 'Bản xem trước cấu trúc; phiên bản này chưa được trả qua API.'}
            </p>
            <pre className="code-block">
              {JSON.stringify(dashboardPayload(batch), null, 2).slice(0, 15000)}
            </pre>
          </TabsContent>
        </Tabs>
        {batch.notes && <p className="detail-notes">Ghi chú: {batch.notes}</p>}
        {confirm && (
          <div className="publish-confirm">
            <strong>{action}?</strong>
            <p>
              Phiên bản này sẽ thay thế dữ liệu đang công bố của cùng chuyên mục
              và kỳ báo cáo. Phiên bản trước được lưu trữ để có thể khôi phục.
            </p>
          </div>
        )}
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            className="secondary-btn"
            onClick={() =>
              downloadBlob(
                JSON.stringify(dashboardPayload(batch), null, 2),
                `${batch.category}_${batch.period}.json`,
                'application/json',
              )
            }
          >
            <Download size={16} />
            Xuất JSON
          </button>
          {!published && canPublish && (
            <button
              disabled={busy}
              className="primary-btn"
              onClick={async () => {
                if (!confirm) {
                  setConfirm(true);
                  return;
                }
                setBusy(true);
                try {
                  await onPublish(batch);
                  setConfirm(false);
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <LoaderCircle size={16} />
              ) : batch.status === 'archived' ? (
                <RotateCcw size={16} />
              ) : (
                <Check size={16} />
              )}{' '}
              {confirm ? 'Xác nhận công bố' : action}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

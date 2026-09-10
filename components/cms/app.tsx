'use client';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Landmark,
  Building2,
  FileText,
  ListTodo,
  ChevronRight,
  ArrowUpRight,
  Upload,
  Clock3,
  CircleCheck,
  Database,
  Link2,
  ShieldCheck,
  History,
  ExternalLink,
  CircleHelp,
  Bell,
  ChevronDown,
  ArrowRight,
  Download,
  Search,
  Settings2,
  Radio,
  X,
  Menu,
} from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  catalog,
  demoBatches,
  type Batch,
  type RequestFn,
} from '@/lib/cms/catalog';
import './cms.css';
import ImportDialog, { Picker } from './import-dialog';
import BatchDetail from './batch-detail';
import Settings from './settings';
import { registerCmsTools } from '@/lib/cms/webmcp';
import { cmsFeatures } from '@/lib/cms/features';
import vtvLogo from './assets/vtv-logo.webp?inline';
const icons = [Landmark, Building2, FileText, Clock3, ListTodo];
const ProfileContainer = cmsFeatures.showSso ? 'button' : 'div';
const statusText = {
  draft: 'Bản nháp',
  published: 'Đã công bố',
  archived: 'Lưu trữ',
};
export default function CmsApp({ request }: { request?: RequestFn }) {
  const [page, setPage] = useState('overview');
  const [batches, setBatches] = useState<Batch[]>(request ? [] : demoBatches);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState<Batch | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(!!request);
  const [notice, setNotice] = useState('');
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const can = (category: string, action: string) =>
    !request ||
    !!info?.grants?.some((g: any) => g.category === category && g[action]);
  const allowedImports = catalog
    .filter((c) => can(c.id, 'can_import'))
    .map((c) => c.id);
  const selected = catalog.find((x) => x.id === page);
  const baseRows = selected
    ? batches.filter((b) => b.category === page)
    : batches;
  const filtered = baseRows.filter(
    (b) =>
      (filter === 'all' || b.status === filter) &&
      (!query ||
        [b.filename, b.period, catalog.find((c) => c.id === b.category)?.name]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  async function reload() {
    if (!request) return;
    const r = await request('/vtv/batches');
    setBatches(r.data);
    setNextOffset(r.meta?.next_offset ?? null);
  }
  useEffect(() => {
    if (request)
      Promise.all([reload(), request('/vtv/info').then((r) => setInfo(r.data))])
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
  }, [request]);
  useEffect(() => {
    const sync = () => {
      const path = window.location.hash.replace(/^#\/?/, '').split('/');
      const id =
        path[0] === 'sso' && !cmsFeatures.showSso ? 'overview' : path[0];
      if (path[0] === 'sso' && !cmsFeatures.showSso)
        window.history.replaceState(null, '', '#/overview');
      if (
        [
          'overview',
          'history',
          'api',
          'sso',
          ...catalog.map((c) => c.id),
        ].includes(id)
      ) {
        setPage(id);
        if (path[1] === 'import') setImportOpen(true);
      }
    };
    sync();
    const m = window.location.pathname.match(/vtv-cms\/([^/]+)\/import$/);
    if (m && catalog.some((c) => c.id === m[1])) {
      setPage(m[1]);
      setImportOpen(true);
    }
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  async function showDetail(b: Batch) {
    setError('');
    try {
      setDetail(request ? (await request('/vtv/batches/' + b.id)).data : b);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function publish(b: Batch) {
    if (request) {
      await request('/vtv/batches/' + b.id + '/publish', {
        method: 'POST',
        body: {},
      });
      await reload();
    } else {
      setBatches((rows) =>
        rows.map((r) =>
          r.id === b.id
            ? {
                ...r,
                status: 'published',
                published_at: new Date().toISOString(),
              }
            : r.category === b.category &&
                r.period === b.period &&
                r.status === 'published'
              ? { ...r, status: 'archived' }
              : r,
        ),
      );
    }
    setNotice('Đã công bố phiên bản ' + b.period + '.');
  }
  function saved(b: Batch) {
    if (
      !request &&
      batches.some(
        (x) =>
          x.source_hash === b.source_hash &&
          x.category === b.category &&
          x.period === b.period,
      )
    )
      throw Error('Tệp này đã được nhập trong phiên xem trước.');
    setBatches((rows) => [b, ...rows]);
    setNotice('Đã lưu bản nháp ' + b.filename);
  }
  const nav = (id: string) => {
    if (id === 'sso' && !cmsFeatures.showSso) id = 'overview';
    setPage(id);
    setQuery('');
    setFilter('all');
    window.location.hash = '/' + id;
  };
  useEffect(
    () => registerCmsTools({ navigate: nav, getBatches: () => batches }),
    [batches],
  );
  return (
    <SidebarProvider className="vtv-cms">
      <Sidebar className="cms-sidebar">
        <SidebarHeader>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              nav('overview');
            }}
          >
            <img
              className="vtv-logo"
              src={vtvLogo}
              alt="VTV"
              width={3840}
              height={1582}
            />
            <span className="brand-sep" />
            <strong>CMS</strong>
          </a>
          <div className="workspace-label">QUẢN TRỊ DASHBOARD</div>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Điều hướng chính">
            <button
              className={`nav-item ${page === 'overview' ? 'active' : ''}`}
              onClick={() => nav('overview')}
            >
              <LayoutDashboard size={19} />
              Tổng quan
            </button>
            <p className="nav-label">QUẢN LÝ DỮ LIỆU</p>
            {['Tài chính', 'Văn phòng điện tử'].map((group, gi) => (
              <div key={group} className="nav-group">
                <div className="nav-group-title">
                  {gi === 0 ? <Landmark size={18} /> : <Building2 size={18} />}
                  <span>{group}</span>
                  <ChevronDown size={14} />
                </div>
                {catalog
                  .filter((c) => c.group === group)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => nav(c.id)}
                      className={`nav-sub ${page === c.id ? 'active' : ''}`}
                    >
                      <span
                        className="nav-dot"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </button>
                  ))}
              </div>
            ))}
            <p className="nav-label">HỆ THỐNG</p>
            {[
              ['history', 'Lịch sử nhập liệu', History],
              ['api', 'Kết nối API', Link2],
              ['sso', 'Đăng nhập SSO', ShieldCheck],
            ]
              .filter(([id]) => id !== 'sso' || cmsFeatures.showSso)
              .map(([id, title, Icon]: any) => (
                <button
                  key={id}
                  className={`nav-item ${page === id ? 'active' : ''}`}
                  onClick={() => nav(id)}
                >
                  <Icon size={19} />
                  {title}
                  {id === 'sso' && <span className="tiny-dot" />}
                </button>
              ))}
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <div className="directus-note">
            <Database size={20} />
            <div>
              <strong>Powered by Directus</strong>
              <small>Không gian quản trị dữ liệu</small>
            </div>
          </div>
          <ProfileContainer
            className="profile"
            onClick={cmsFeatures.showSso ? () => nav('sso') : undefined}
          >
            <span className="avatar">QT</span>
            <span>
              <strong>
                {request ? 'Tài khoản Directus' : 'Quản trị viên'}
              </strong>
              <small>
                {request ? 'Phiên đăng nhập hiện tại' : 'Không gian xem trước'}
              </small>
            </span>
            {cmsFeatures.showSso && <Settings2 size={17} />}
          </ProfileContainer>
        </SidebarFooter>
      </Sidebar>
      <div className="cms-workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>VTV Dashboard</span>
            <ChevronRight size={14} />
            <strong>Quản trị nội dung</strong>
          </div>
          <div className="header-actions">
            <a
              href="https://dashboard.vtv.gov.vn/#/tong-quan"
              target="_blank"
              rel="noreferrer"
            >
              Mở Dashboard <ArrowUpRight size={15} />
            </a>
            {request && <a href="/admin/content">Directus</a>}
            <span className="header-divider" />
            <span className="environment">
              <span />
              {request ? 'Directus' : 'Bản xem trước'}
            </span>
          </div>
        </header>
        <main className="cms-main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">ĐÀI TRUYỀN HÌNH VIỆT NAM</div>
              <h1>
                {selected?.name ||
                  (
                    {
                      overview: 'Tổng quan quản trị',
                      history: 'Lịch sử nhập liệu',
                      api: 'Kết nối API',
                      sso: 'Đăng nhập SSO',
                    } as any
                  )[page]}
              </h1>
              <p>
                {selected?.description ||
                  'Quản lý, kiểm tra và công bố dữ liệu lên Dashboard.'}
              </p>
            </div>
            {allowedImports.length > 0 && (
              <button
                className="primary-btn"
                onClick={() => setImportOpen(true)}
              >
                <Upload size={17} />
                Nhập dữ liệu
              </button>
            )}
          </div>
          {!request && (
            <div className="preview-note">
              <Radio size={15} />
              Chế độ xem trước · Số liệu minh họa, thao tác chỉ lưu trong phiên
              này.
            </div>
          )}
          {error && (
            <div className="error-box" role="alert">
              {error}
              <button
                className="text-btn"
                onClick={() => {
                  setError('');
                  void reload().catch((e) => setError(e.message));
                }}
              >
                Thử lại
              </button>
            </div>
          )}
          {notice && (
            <div className="notice-box" role="status">
              {notice}
              <button aria-label="Đóng thông báo" onClick={() => setNotice('')}>
                <X size={15} />
              </button>
            </div>
          )}
          {loading && (
            <p className="loading-label">Đang tải dữ liệu từ Directus…</p>
          )}
          {page === 'overview' && (
            <>
              <section className="stats-grid">
                <Stat
                  title="Chuyên mục dữ liệu"
                  value="05"
                  icon={Database}
                  color="red"
                  note="2 lĩnh vực đang quản lý"
                />
                <Stat
                  title="Đã công bố"
                  value={String(
                    batches.filter((b) => b.status === 'published').length,
                  ).padStart(2, '0')}
                  icon={CircleCheck}
                  color="green"
                  note="Sẵn sàng cung cấp cho Dashboard"
                />
                <Stat
                  title="Chờ công bố"
                  value={String(
                    batches.filter((b) => b.status === 'draft').length,
                  ).padStart(2, '0')}
                  icon={Clock3}
                  color="amber"
                  note="Kiểm tra trước khi phát hành"
                />
                <Stat
                  title="Lần nhập dữ liệu"
                  value={String(batches.length).padStart(2, '0')}
                  icon={Upload}
                  color="purple"
                  note="Bao gồm tất cả phiên bản"
                />
              </section>
              <section className="section-title">
                <h2>Chuyên mục dữ liệu</h2>
                <span>
                  5 chuyên mục <span className="middle-dot">·</span> Tài chính &
                  Văn phòng điện tử
                </span>
              </section>
              <section className="category-grid">
                {catalog.map((c, i) => {
                  const Icon = icons[i];
                  const rows = batches.filter((b) => b.category === c.id);
                  return (
                    <button
                      className="category-card"
                      style={
                        { '--category-color': c.color } as React.CSSProperties
                      }
                      key={c.id}
                      onClick={() => nav(c.id)}
                    >
                      <div className="category-top">
                        <span className="category-icon">
                          <Icon size={22} />
                        </span>
                        <ArrowUpRight size={18} className="muted" />
                      </div>
                      <div className="category-group">{c.group}</div>
                      <h3>{c.name}</h3>
                      <p>{c.description}</p>
                      <div className="category-bottom">
                        <span>
                          <span
                            className={`status-dot ${rows.some((b) => b.status === 'published') ? 'green' : 'amber'}`}
                          />
                          {rows.some((b) => b.status === 'published')
                            ? 'Đã có dữ liệu'
                            : 'Chưa công bố'}
                        </span>
                        <span>{rows.length} phiên bản</span>
                      </div>
                    </button>
                  );
                })}
              </section>
            </>
          )}
          {['overview', 'history', ...catalog.map((c) => c.id)].includes(
            page,
          ) && (
            <div
              className={`content-grid ${page !== 'overview' ? 'full-width' : ''}`}
            >
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {page === 'overview'
                        ? 'Nhập liệu gần đây'
                        : 'Các phiên bản dữ liệu'}
                    </h2>
                    <p>Mỗi lần nhập được lưu thành một phiên bản riêng.</p>
                  </div>
                  {page === 'overview' && (
                    <button className="text-btn" onClick={() => nav('history')}>
                      Xem tất cả <ArrowRight size={15} />
                    </button>
                  )}
                </div>
                {page !== 'overview' && (
                  <div className="table-tools">
                    <label className="search-field">
                      <Search size={17} />
                      <input
                        aria-label="Tìm kiếm phiên bản"
                        placeholder="Tìm tên tệp, chuyên mục, kỳ báo cáo…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <Picker
                      label="Lọc trạng thái"
                      value={filter}
                      onChange={setFilter}
                      options={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'draft', label: 'Bản nháp' },
                        { value: 'published', label: 'Đã công bố' },
                        { value: 'archived', label: 'Lưu trữ' },
                      ]}
                    />
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>TỆP DỮ LIỆU</TableHead>
                      <TableHead>KỲ BÁO CÁO</TableHead>
                      <TableHead>TRẠNG THÁI</TableHead>
                      <TableHead>THỜI GIAN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((b) => (
                      <TableRow key={b.id} className="record-row">
                        <TableCell>
                          <div className="file-cell">
                            <span className="excel-icon">
                              <FileText size={20} />
                            </span>
                            <div>
                              <button
                                className="file-name-btn"
                                onClick={() => void showDetail(b)}
                              >
                                {b.filename}
                              </button>
                              <small>
                                {catalog.find((c) => c.id === b.category)?.name}
                              </small>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{b.period}</TableCell>
                        <TableCell>
                          <span className={`status-badge ${b.status}`}>
                            {statusText[b.status]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="date-cell">
                            {new Date(b.date_created).toLocaleDateString(
                              'vi-VN',
                              { timeZone: 'Asia/Ho_Chi_Minh' },
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!filtered.length && (
                  <div className="empty-state">
                    <Database />
                    <h3>Chưa có dữ liệu</h3>
                    <p>Nhập tệp đầu tiên cho chuyên mục này.</p>
                  </div>
                )}
                <div className="table-footer">
                  {filtered.length} phiên bản{' '}
                  {nextOffset !== null && (
                    <button
                      className="text-btn"
                      onClick={async () => {
                        try {
                          const r = await request!(
                            '/vtv/batches?offset=' + nextOffset,
                          );
                          setBatches((bs) => [...bs, ...r.data]);
                          setNextOffset(r.meta?.next_offset ?? null);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Tải thêm
                    </button>
                  )}
                  <span>
                    <ShieldCheck size={14} /> Dữ liệu chỉ hiển thị sau khi công
                    bố
                  </span>
                </div>
              </section>
              {page === 'overview' && (
                <aside className="right-panels">
                  <section className="panel connections">
                    <h2>Kết nối hệ thống</h2>
                    <div className="connection-item">
                      <span className="connection-icon">
                        <Radio size={19} />
                      </span>
                      <div>
                        <strong>Dashboard API</strong>
                        <small>
                          {request ? 'Directus REST API' : 'Sẵn sàng tích hợp'}
                        </small>
                      </div>
                      <span className="status-dot green" />
                    </div>
                    {cmsFeatures.showSso && (
                      <div className="connection-item">
                        <span className="connection-icon purple">
                          <ShieldCheck size={19} />
                        </span>
                        <div>
                          <strong>Đăng nhập SSO</strong>
                          <small>
                            {info?.sso_configured
                              ? 'Đã cấu hình nhà cung cấp'
                              : 'Chờ cấu hình nhà cung cấp'}
                          </small>
                        </div>
                        <span className="status-dot amber" />
                      </div>
                    )}
                    <button
                      className="secondary-btn full"
                      onClick={() => nav('api')}
                    >
                      Quản lý kết nối <ArrowRight size={15} />
                    </button>
                  </section>
                </aside>
              )}
            </div>
          )}
          {(page === 'api' || (cmsFeatures.showSso && page === 'sso')) && (
            <Settings
              page={page}
              native={!!request}
              ssoConfigured={!!info?.sso_configured}
            />
          )}
          <footer className="cms-footer">
            <span>
              VTV CMS <span>·</span> Hệ thống quản trị dữ liệu tập trung
            </span>
            <span>
              Directus <span>·</span>{' '}
              {request ? 'Đã kết nối' : 'Bản xem trước giao diện'}
            </span>
          </footer>
        </main>
      </div>
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        initialCategory={selected?.id}
        request={request}
        onSaved={saved}
        allowedCategories={allowedImports}
      />
      <BatchDetail
        batch={detail}
        onClose={() => setDetail(null)}
        onPublish={publish}
        canPublish={!!detail && can(detail.category, 'can_publish')}
      />
    </SidebarProvider>
  );
}
function Stat({ title, value, icon: Icon, color, note }: any) {
  return (
    <div className="stat-card">
      <div>
        <span>{title}</span>
        <div className={`stat-icon ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

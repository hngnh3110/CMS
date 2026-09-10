'use client';
import { useState } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  Link2,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import { catalog } from '@/lib/cms/catalog';
import { Picker } from './import-dialog';
export default function Settings({
  page,
  native,
  ssoConfigured,
}: {
  page: string;
  native: boolean;
  ssoConfigured: boolean;
}) {
  const [cat, setCat] = useState('bctc');
  const [copied, setCopied] = useState(false);
  const snippet = `// Gọi từ máy chủ Dashboard; không đưa token vào mã trình duyệt.\nconst response = await fetch(\n  process.env.CMS_URL + '/vtv/dashboard/${cat}?period=2026-09',\n  { headers: { Authorization: 'Bearer ' + process.env.CMS_API_TOKEN } }\n);\nif (!response.ok) throw new Error('CMS: ' + response.status);\nconst { data } = await response.json();`;
  const config = `AUTH_PROVIDERS=vtv\nAUTH_VTV_DRIVER=openid\nAUTH_VTV_MODE=session\nAUTH_VTV_ISSUER_URL=https://<sso-host>/.well-known/openid-configuration\nAUTH_VTV_CLIENT_ID=<client-id>\nAUTH_VTV_CLIENT_SECRET=<secret>\nAUTH_VTV_IDENTIFIER_KEY=sub\nAUTH_VTV_ALLOW_PUBLIC_REGISTRATION=false\nAUTH_VTV_DEFAULT_ROLE_ID=<role-id>\nAUTH_VTV_REDIRECT_ALLOW_LIST=https://<cms-host>/admin/vtv-cms`;
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="settings-title">
          {page === 'api' ? <Link2 size={24} /> : <ShieldCheck size={24} />}
          <div>
            <h2>
              {page === 'api'
                ? 'API dành cho Dashboard'
                : 'Kết nối SSO của đơn vị'}
            </h2>
            <span
              className={`status-badge ${page === 'sso' && !ssoConfigured ? 'draft' : 'published'}`}
            >
              {page === 'api'
                ? native
                  ? 'Directus đã kết nối'
                  : 'Sẵn sàng tích hợp'
                : ssoConfigured
                  ? 'Đã cấu hình'
                  : 'Chờ cấu hình'}
            </span>
          </div>
        </div>
        {page === 'api' ? (
          <>
            <p>
              Mỗi chuyên mục có một đầu API chỉ đọc. Bản nháp, tệp gốc và thông
              tin người nhập không được trả về.
            </p>
            <label className="block-label">
              Chuyên mục
              <Picker
                label="Chuyên mục API"
                value={cat}
                onChange={setCat}
                options={catalog.map((c) => ({ value: c.id, label: c.name }))}
              />
            </label>
            <div className="endpoint">
              <span>GET</span>
              <code>/vtv/dashboard/{cat}</code>
            </div>
            <div className="api-fields">
              <span>period</span>
              <p>
                Kỳ cụ thể, ví dụ 2026-09 hoặc 2026-Q3. Bỏ qua để lấy phiên bản
                được công bố gần nhất.
              </p>
            </div>
            <h3>Ví dụ tích hợp phía máy chủ</h3>
            <pre className="code-block">{snippet}</pre>
          </>
        ) : (
          <>
            <p>
              Dùng tài khoản SSO hiện có để đăng nhập CMS. Directus xử lý chuyển
              hướng, xác minh danh tính và tạo phiên đăng nhập.
            </p>
            <div className="sso-flow">
              <span>CMS VTV</span>
              <span>→</span>
              <span>SSO của đơn vị</span>
              <span>→</span>
              <span>Phiên Directus</span>
            </div>
            <h3>Thông tin cần chuẩn bị</h3>
            <ul className="requirements">
              <li>Địa chỉ discovery OpenID Connect (Issuer URL)</li>
              <li>Client ID và Client Secret do hệ thống SSO cấp</li>
              <li>Vai trò tối thiểu dành cho tài khoản được phép đăng nhập</li>
            </ul>
            <p className="form-hint">Callback cần đăng ký tại hệ thống SSO:</p>
            <code className="callback">
              https://&lt;cms-host&gt;/auth/login/vtv/callback
            </code>
            <h3>Cấu hình trên máy chủ</h3>
            <pre className="code-block">{config}</pre>
            <p className="form-hint">
              Giữ AUTH_PROVIDERS trống đến khi hoàn tất cấu hình. Không nhập
              Client Secret trong bản xem trước này. SAML có hướng dẫn riêng
              trong tài liệu bàn giao.
            </p>
          </>
        )}
        <button
          className="secondary-btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                page === 'api' ? snippet : config,
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}{' '}
          {copied ? 'Đã sao chép' : 'Sao chép cấu hình'}
        </button>
      </section>
      <aside className="panel settings-aside">
        <KeyRound size={25} />
        <h2>Quyền truy cập rõ ràng</h2>
        <div>
          <strong>Người nhập liệu</strong>
          <p>Nhập và xem phiên bản trong lĩnh vực được phân công.</p>
        </div>
        <div>
          <strong>Người công bố</strong>
          <p>Kiểm tra, công bố hoặc khôi phục phiên bản.</p>
        </div>
        <div>
          <strong>Tài khoản Dashboard</strong>
          <p>Chỉ đọc dữ liệu đã công bố qua API.</p>
        </div>
        {native && (
          <a className="secondary-btn" href="/admin/users">
            Quản lý tài khoản <ExternalLink size={14} />
          </a>
        )}
      </aside>
    </div>
  );
}

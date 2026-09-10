import { randomUUID } from 'node:crypto';
const base =
  process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055';
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
  throw Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.');
let token;
async function api(path, method = 'GET', body) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const j = await r.json();
  if (!r.ok)
    throw Error(`${method} ${path}: ${j.errors?.[0]?.message || r.status}`);
  return j.data;
}
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(base + '/server/health');
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1500));
}
token = (
  await api('/auth/login', 'POST', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  })
).access_token;
const id = () => ({
  field: 'id',
  type: 'uuid',
  schema: { is_primary_key: true, is_nullable: false },
  meta: { interface: 'input', special: ['uuid'], hidden: true },
});
const str = (field, extra = {}) => ({
  field,
  type: 'string',
  schema: { is_nullable: true, ...extra },
  meta: { interface: 'input' },
});
const bool = (field) => ({
  field,
  type: 'boolean',
  schema: { default_value: false },
  meta: { interface: 'boolean', special: ['cast-boolean'] },
});
const date = (field, special) => ({
  field,
  type: 'timestamp',
  schema: { is_nullable: true },
  meta: {
    interface: 'datetime',
    ...(special ? { special: [special], readonly: true } : {}),
  },
});
const definitions = [
  {
    collection: 'cms_categories',
    meta: {
      icon: 'category',
      note: 'Chuyên mục và khóa công bố',
      hidden: true,
      accountability: 'all',
    },
    schema: {},
    fields: [
      {
        field: 'id',
        type: 'string',
        schema: { is_primary_key: true, is_nullable: false },
        meta: { interface: 'input' },
      },
      str('name'),
    ],
  },
  {
    collection: 'cms_grants',
    meta: {
      icon: 'admin_panel_settings',
      note: 'Phân quyền CMS theo vai trò Directus; chỉ quản trị viên sửa.',
      accountability: 'all',
    },
    schema: {},
    fields: [
      id(),
      str('role', { is_nullable: false }),
      str('category', { is_nullable: false }),
      bool('can_read'),
      bool('can_import'),
      bool('can_publish'),
    ],
  },
  {
    collection: 'cms_batches',
    meta: {
      icon: 'inventory_2',
      note: 'Phiên bản nhập dữ liệu; thay đổi trạng thái qua VTV CMS.',
      accountability: 'all',
    },
    schema: {},
    fields: [
      id(),
      str('category', { is_nullable: false }),
      str('period', { is_nullable: false }),
      str('filename'),
      str('status', { default_value: 'draft', is_nullable: false }),
      {
        field: 'records',
        type: 'json',
        meta: { interface: 'input-code', special: ['cast-json'] },
        schema: { is_nullable: false },
      },
      { field: 'row_count', type: 'integer', schema: { is_nullable: false } },
      { field: 'notes', type: 'text', meta: { interface: 'input-multiline' } },
      str('source_file'),
      str('source_hash', { max_length: 64 }),
      str('dedup_key', { max_length: 64, is_unique: true }),
      str('user_name'),
      date('published_at'),
      date('date_created', 'date-created'),
      date('date_updated', 'date-updated'),
      {
        field: 'user_created',
        type: 'uuid',
        meta: { special: ['user-created'], readonly: true },
      },
      {
        field: 'user_updated',
        type: 'uuid',
        meta: { special: ['user-updated'], readonly: true },
      },
    ],
  },
];
const existing = new Set((await api('/collections')).map((c) => c.collection));
for (const d of definitions) {
  if (!existing.has(d.collection)) {
    await api('/collections', 'POST', d);
    console.log(`Created ${d.collection}`);
  } else {
    const current = new Set(
      (await api(`/fields/${d.collection}`)).map((f) => f.field),
    );
    for (const f of d.fields) {
      if (!current.has(f.field))
        await api(`/fields/${d.collection}`, 'POST', f);
    }
  }
}
const categories = [
  ['bctc', 'Báo cáo tài chính'],
  ['dautu', 'Đầu tư công'],
  ['eoffice', 'Tổng quan & Sử dụng'],
  ['vanban', 'Tiến độ xử lý văn bản'],
  ['nhiemvu', 'Nhiệm vụ tổng quan'],
];
const currentCats = new Set(
  (await api('/items/cms_categories?limit=-1')).map((c) => c.id),
);
for (const [id, name] of categories)
  if (!currentCats.has(id))
    await api('/items/cms_categories', 'POST', { id, name });
const presets = [
  {
    name: 'VTV · Nhập liệu tài chính',
    categories: ['bctc', 'dautu'],
    can_import: true,
    app: true,
  },
  {
    name: 'VTV · Nhập liệu văn phòng',
    categories: ['eoffice', 'vanban', 'nhiemvu'],
    can_import: true,
    app: true,
  },
  {
    name: 'VTV · Người công bố',
    categories: categories.map((c) => c[0]),
    can_publish: true,
    app: true,
  },
  {
    name: 'VTV · Dashboard API',
    categories: categories.map((c) => c[0]),
    can_read: true,
    app: false,
  },
];
const roles = await api('/roles?limit=-1');
const policies = await api('/policies?limit=-1');
const access = await api('/access?limit=-1');
const grants = await api('/items/cms_grants?limit=-1');
for (const p of presets) {
  let role = roles.find((r) => r.name === p.name);
  if (!role)
    role = await api('/roles', 'POST', {
      name: p.name,
      icon: p.app ? 'supervised_user_circle' : 'api',
    });
  let policy = policies.find((r) => r.name === p.name);
  if (!policy)
    policy = await api('/policies', 'POST', {
      name: p.name,
      icon: 'verified_user',
      admin_access: false,
      app_access: p.app,
    });
  if (!access.some((a) => a.role === role.id && a.policy === policy.id))
    await api('/access', 'POST', { role: role.id, policy: policy.id });
  for (const c of p.categories)
    if (!grants.some((g) => g.role === role.id && g.category === c))
      await api('/items/cms_grants', 'POST', {
        id: randomUUID(),
        role: role.id,
        category: c,
        can_read: !!p.can_read,
        can_import: !!p.can_import,
        can_publish: !!p.can_publish,
      });
  console.log(`${p.name}: ${role.id}`);
}
const settings = await api('/settings');
const moduleBar = Array.isArray(settings.module_bar) ? settings.module_bar : [];
const next = [
  { type: 'module', id: 'vtv-cms', enabled: true },
  ...moduleBar.filter((m) => m.id !== 'vtv-cms'),
];
await api('/settings', 'PATCH', {
  project_name: 'VTV · Hệ thống quản trị dữ liệu',
  project_color: '#C32731',
  default_language: 'vi-VN',
  default_appearance: 'light',
  theme_light_overrides: {
    theme: {
      primary: '#C32731',
      background: '#F7F8FA',
      navigation: { background: '#FFFFFF' },
    },
  },
  module_bar: next,
});
console.log(
  'CMS schema, category permissions and branding ready. Open /admin/vtv-cms. No sample reports were inserted.',
);

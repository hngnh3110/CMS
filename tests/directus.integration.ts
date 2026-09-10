/** Run only against a dedicated local/test Directus, with ADMIN_EMAIL/ADMIN_PASSWORD. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as XLSX from 'xlsx';
if (process.env.RUN_DIRECTUS_INTEGRATION !== '1')
  throw Error(
    'Set RUN_DIRECTUS_INTEGRATION=1 for the dedicated test instance.',
  );
process.loadEnvFile('.env');
const base = process.env.TEST_DIRECTUS_URL || 'http://localhost:8055';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw Error('Integration runner is limited to loopback instances.');
const createdUsers: string[] = [];
const batches: string[] = [];
const sourceFiles: string[] = [];
let admin = '';
let checks = 0;
async function api(
  path: string,
  method = 'GET',
  body?: unknown,
  token = admin,
  expected = 200,
  extra: Record<string, string> = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const j: any = await r.json();
  assert.equal(r.status, expected, `${method} ${path}: ${JSON.stringify(j)}`);
  checks++;
  return j;
}
const file = (closing = 12) => {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    b,
    XLSX.utils.aoa_to_sheet([
      ['Mã số', 'Tên chỉ tiêu', 'Số đầu kỳ', 'Số cuối kỳ'],
      ['100', 'Kiểm thử', 10, closing],
    ]),
    'Data',
  );
  return Buffer.from(
    XLSX.write(b, { type: 'buffer', bookType: 'xlsx' }),
  ).toString('base64');
};
const payload = {
  category: 'bctc',
  period: '2026-01',
  filename: 'integration-' + randomUUID() + '.xlsx',
  sourceUnit: 'ty',
  numberLocale: 'vi',
  content: file(),
};
try {
  admin = (
    await api(
      '/auth/login',
      'POST',
      { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
      '',
      200,
    )
  ).data.access_token;
  await api('/vtv/info', 'GET', undefined, '', 401);
  await api('/vtv/dashboard/bctc', 'GET', undefined, '', 401);
  const roles = (await api('/roles?limit=-1')).data;
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  for (const [kind, name] of Object.entries({
    editor: 'VTV · Nhập liệu tài chính',
    office: 'VTV · Nhập liệu văn phòng',
    publisher: 'VTV · Người công bố',
    reader: 'VTV · Dashboard API',
  })) {
    const password = randomUUID() + 'Aa1!';
    const email = 'cms-test-' + kind + '-' + randomUUID() + '@example.com';
    const u = (
      await api('/users', 'POST', {
        email,
        password,
        role: roles.find((r: any) => r.name === name).id,
        status: 'active',
        first_name: 'Integration ' + kind,
      })
    ).data;
    createdUsers.push(u.id);
    userIds[kind] = u.id;
    tokens[kind] = (
      await api('/auth/login', 'POST', { email, password }, '')
    ).data.access_token;
  }
  await api('/vtv/preview', 'POST', payload, tokens.office, 403);
  const preview = (await api('/vtv/preview', 'POST', payload, tokens.editor))
    .data;
  assert.equal(preview.errors.length, 0);
  await api('/vtv/imports', 'POST', payload, tokens.editor, 403, {
    Origin: 'https://untrusted.example',
  });
  const first = (await api('/vtv/imports', 'POST', payload, tokens.editor, 201))
    .data;
  batches.push(first.id);
  const source = (await api('/items/cms_batches/' + first.id)).data;
  sourceFiles.push(source.source_file);
  assert.equal(source.user_created, userIds.editor);
  await api(
    '/items/cms_batches/' + first.id,
    'GET',
    undefined,
    tokens.editor,
    403,
  );
  await api(
    '/assets/' + source.source_file,
    'GET',
    undefined,
    tokens.office,
    403,
  );
  await api('/vtv/batches/' + first.id, 'GET', undefined, tokens.office, 403);
  await api(
    '/vtv/dashboard/bctc?period=2026-01',
    'GET',
    undefined,
    tokens.reader,
    404,
  );
  await api(
    '/vtv/batches/' + first.id + '/publish',
    'POST',
    {},
    tokens.editor,
    403,
  );
  await api('/vtv/imports', 'POST', payload, tokens.editor, 409);
  await api(
    '/vtv/batches/' + first.id + '/publish',
    'POST',
    {},
    tokens.publisher,
  );
  const published = (
    await api(
      '/vtv/dashboard/bctc?period=2026-01',
      'GET',
      undefined,
      tokens.reader,
    )
  ).data;
  assert.equal(published.records[0].closing, 12);
  assert.equal('filename' in published, false);
  assert.equal('source_file' in published, false);
  const second = (
    await api(
      '/vtv/imports',
      'POST',
      { ...payload, content: file(15) },
      tokens.editor,
      201,
    )
  ).data;
  batches.push(second.id);
  sourceFiles.push(
    (await api('/items/cms_batches/' + second.id)).data.source_file,
  );
  await Promise.all([
    api('/vtv/batches/' + second.id + '/publish', 'POST', {}, tokens.publisher),
    api('/vtv/batches/' + first.id + '/publish', 'POST', {}, tokens.publisher),
  ]);
  const after = (
    await api(
      '/items/cms_batches?filter[category][_eq]=bctc&filter[period][_eq]=2026-01&filter[status][_eq]=published',
    )
  ).data;
  assert.equal(after.length, 1);
  await api(
    '/vtv/batches/' + second.id + '/publish',
    'POST',
    {},
    tokens.publisher,
  );
  await api(
    '/vtv/batches/' + first.id + '/publish',
    'POST',
    {},
    tokens.publisher,
  );
  assert.equal(
    (
      await api(
        '/vtv/dashboard/bctc?period=2026-01',
        'GET',
        undefined,
        tokens.reader,
      )
    ).data.version,
    first.id,
  );
  assert.equal(
    (await api('/vtv/batches', 'GET', undefined, tokens.reader)).data.length,
    0,
  );
  const audit = (
    await api(
      '/activity?filter[collection][_eq]=cms_batches&filter[item][_eq]=' +
        first.id,
    )
  ).data;
  assert.ok(audit.some((a: any) => a.user === userIds.editor));
  assert.ok(audit.some((a: any) => a.user === userIds.publisher));
  console.log(
    `${checks} live Directus checks passed: authentication, category isolation, original-file access, import, duplicate detection, publication, concurrency, restoration and audit.`,
  );
} finally {
  for (const [collection, ids] of [
    ['cms_batches', batches],
    ['directus_files', sourceFiles],
    ['directus_users', createdUsers],
  ] as const)
    for (const id of ids) {
      const path =
        collection === 'directus_files'
          ? '/files/'
          : collection === 'directus_users'
            ? '/users/'
            : '/items/' + collection + '/';
      const r = await fetch(base + path + id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + admin },
      });
      if (!r.ok)
        console.error('Fixture cleanup failed', collection, id, r.status);
    }
}

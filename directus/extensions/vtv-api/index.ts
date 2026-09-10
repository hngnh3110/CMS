import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import {
  parseImport,
  MAX_FILE_BYTES,
  validatePeriod,
} from '../../../lib/cms/importer';
import { catalog } from '../../../lib/cms/catalog';
import { dashboardPayload } from '../../../lib/cms/dashboard';
const fail = (status: number, message: string) =>
  Object.assign(new Error(message), { status });
const fields = [
  'id',
  'category',
  'filename',
  'period',
  'status',
  'row_count',
  'date_created',
  'published_at',
  'user_name',
  'notes',
  'source_hash',
];
export default {
  id: 'vtv',
  handler(router: any, { services, database, getSchema, env, logger }: any) {
    const { ItemsService, FilesService } = services;
    const wrap = (fn: any) => async (req: any, res: any, next: any) => {
      try {
        if (!req.accountability?.user || req.accountability?.share)
          throw fail(401, 'Vui lòng đăng nhập.');
        res.set('Cache-Control', 'no-store');
        await fn(req, res);
      } catch (e: any) {
        if (e.status)
          res.status(e.status).json({ errors: [{ message: e.message }] });
        else next(e);
      }
    };
    async function grants(req: any, db = database) {
      if (req.accountability.admin)
        return catalog.map((c) => ({
          category: c.id,
          can_read: true,
          can_import: true,
          can_publish: true,
        }));
      const roles = [
        ...new Set(
          [...(req.accountability.roles || []), req.accountability.role].filter(
            Boolean,
          ),
        ),
      ];
      if (!roles.length) return [];
      return db('cms_grants')
        .whereIn('role', roles)
        .select('category', 'can_read', 'can_import', 'can_publish');
    }
    const permits = (g: any[], c: string, action: string) =>
      g.some((x) => x.category === c && Boolean(x[action]));
    async function allowed(req: any, c: string, action: string, db = database) {
      if (!catalog.some((x) => x.id === c))
        throw fail(404, 'Không tìm thấy chuyên mục.');
      const g = await grants(req, db);
      if (!permits(g, c, action))
        throw fail(
          403,
          'Bạn không có quyền thực hiện thao tác trong chuyên mục này.',
        );
    }
    // Privilege is scoped to these endpoints; caller identity is preserved for Directus audit.
    async function service(req: any, collection: string, trx?: any) {
      return new ItemsService(collection, {
        schema: await getSchema(),
        accountability: { ...req.accountability, admin: true },
        ...(trx ? { knex: trx } : {}),
      });
    }
    async function fileService(req: any) {
      return new FilesService({
        schema: await getSchema(),
        accountability: { ...req.accountability, admin: true },
      });
    }
    function checkOrigin(req: any) {
      const origin = req.get('origin');
      if (!origin) return;
      const origins = [
        env.PUBLIC_URL,
        ...String(env.CORS_ORIGIN || '').split(','),
      ]
        .filter(Boolean)
        .map((s: string) => {
          try {
            return new URL(s).origin;
          } catch {
            return '';
          }
        });
      if (!origins.includes(origin))
        throw fail(403, 'Nguồn yêu cầu không được phép.');
    }
    function input(req: any) {
      checkOrigin(req);
      if (!req.is('application/json')) throw fail(415, 'Yêu cầu phải là JSON.');
      const b = req.body || {};
      if (
        typeof b.filename !== 'string' ||
        b.filename.length > 180 ||
        /[\x00-\x1f/\\]/.test(b.filename)
      )
        throw fail(400, 'Tên tệp không hợp lệ.');
      if (
        typeof b.content !== 'string' ||
        b.content.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 ||
        b.content.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(b.content)
      )
        throw fail(400, 'Nội dung tệp không hợp lệ hoặc quá 5 MB.');
      if (typeof b.period !== 'string' || !validatePeriod(b.period))
        throw fail(400, 'Kỳ báo cáo không hợp lệ.');
      const bytes = Buffer.from(b.content, 'base64');
      if (bytes.toString('base64') !== b.content)
        throw fail(400, 'Mã hóa tệp không hợp lệ.');
      return {
        category: b.category,
        filename: b.filename,
        period: b.period,
        sheet: typeof b.sheet === 'string' ? b.sheet : undefined,
        sourceUnit: b.sourceUnit,
        numberLocale: b.numberLocale,
        notes: String(b.notes || '').slice(0, 2000),
        bytes,
      };
    }
    router.get(
      '/info',
      wrap(async (req: any, res: any) => {
        const providers = String(env.AUTH_PROVIDERS || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        res.json({
          data: {
            grants: await grants(req),
            sso_configured: providers.includes('vtv'),
            directus_version: '11.17.4',
          },
        });
      }),
    );
    router.get(
      '/batches',
      wrap(async (req: any, res: any) => {
        const g = await grants(req);
        const categories = catalog
          .filter(
            (c) =>
              permits(g, c.id, 'can_import') || permits(g, c.id, 'can_publish'),
          )
          .map((c) => c.id);
        const offset = Math.max(
          0,
          Math.min(100000, Number(req.query.offset) || 0),
        );
        if (!categories.length)
          return res.json({ data: [], meta: { next_offset: null } });
        const s = await service(req, 'cms_batches');
        const data = await s.readByQuery({
          filter: { category: { _in: categories } },
          fields,
          sort: ['-date_created', '-id'],
          limit: 101,
          offset,
        });
        res.json({
          data: data.slice(0, 100),
          meta: { next_offset: data.length > 100 ? offset + 100 : null },
        });
      }),
    );
    router.get(
      '/batches/:id',
      wrap(async (req: any, res: any) => {
        const s = await service(req, 'cms_batches');
        const batch = await s.readOne(req.params.id, {
          fields: [...fields, 'records'],
        });
        const g = await grants(req);
        if (
          !permits(g, batch.category, 'can_import') &&
          !permits(g, batch.category, 'can_publish')
        )
          throw fail(403, 'Bạn không có quyền xem bản nhập này.');
        res.json({ data: batch });
      }),
    );
    router.post(
      '/preview',
      wrap(async (req: any, res: any) => {
        await allowed(req, req.body?.category, 'can_import');
        const data = input(req);
        try {
          res.json({ data: parseImport(data.bytes, data) });
        } catch (e: any) {
          throw fail(422, e.message);
        }
      }),
    );
    router.post(
      '/imports',
      wrap(async (req: any, res: any) => {
        await allowed(req, req.body?.category, 'can_import');
        const data = input(req);
        let parsed;
        try {
          parsed = parseImport(data.bytes, data);
        } catch (e: any) {
          throw fail(422, e.message);
        }
        if (parsed.errors.length) throw fail(422, 'Tệp còn lỗi, chưa thể lưu.');
        const sourceHash = createHash('sha256')
          .update(data.bytes)
          .digest('hex');
        const dedup = createHash('sha256')
          .update(
            JSON.stringify([
              data.category,
              data.period,
              sourceHash,
              parsed.sheet,
              data.sourceUnit || null,
              data.numberLocale || 'vi',
            ]),
          )
          .digest('hex');
        if (
          await database('cms_batches').where({ dedup_key: dedup }).first('id')
        )
          throw fail(
            409,
            'Tệp này đã được nhập cho cùng kỳ, trang tính và đơn vị.',
          );
        const fs = await fileService(req);
        let fileId: any;
        let committed = false;
        try {
          const ext = data.filename.split('.').pop()?.toLowerCase();
          const mime = {
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            xls: 'application/vnd.ms-excel',
            csv: 'text/csv',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }[ext as 'xlsx'];
          fileId = await fs.uploadOne(Readable.from(data.bytes), {
            filename_download: data.filename,
            title: data.filename,
            storage: 'local',
            type: mime,
          });
          const id = await database.transaction(async (trx: any) => {
            await allowed(req, data.category, 'can_import', trx);
            const s = await service(req, 'cms_batches', trx);
            const u = await trx('directus_users')
              .where({ id: req.accountability.user })
              .first('first_name', 'last_name');
            return s.createOne(
              {
                category: data.category,
                period: data.period,
                filename: data.filename,
                notes: data.notes,
                status: 'draft',
                records: parsed.records,
                row_count: parsed.records.length,
                source_file: fileId,
                source_hash: sourceHash,
                dedup_key: dedup,
                user_name:
                  [u?.first_name, u?.last_name].filter(Boolean).join(' ') ||
                  'Người dùng Directus',
              },
              { emitEvents: false },
            );
          });
          committed = true;
          const s = await service(req, 'cms_batches');
          res
            .status(201)
            .json({
              data: await s.readOne(id, { fields: [...fields, 'records'] }),
            });
        } catch (e: any) {
          if (fileId && !committed)
            try {
              await fs.deleteOne(fileId);
            } catch (cleanup) {
              logger.error(
                { err: cleanup, fileId },
                'VTV source cleanup failed',
              );
            }
          if (
            e.code === '23505' ||
            e.code === 'SQLITE_CONSTRAINT' ||
            e.code === 'RECORD_NOT_UNIQUE'
          )
            throw fail(409, 'Tệp này đã được nhập.');
          throw e;
        }
      }),
    );
    router.post(
      '/batches/:id/publish',
      wrap(async (req: any, res: any) => {
        checkOrigin(req);
        const initial = await database('cms_batches')
          .where({ id: req.params.id })
          .first('category');
        if (!initial) throw fail(404, 'Không tìm thấy phiên bản.');
        await allowed(req, initial.category, 'can_publish');
        await database.transaction(async (trx: any) => {
          // Locks the category, serializing publications including first publication and restoration.
          const locked = await trx('cms_categories')
            .where({ id: initial.category })
            .forUpdate()
            .first();
          if (!locked) throw fail(409, 'Chuyên mục chưa được cấu hình.');
          const s = await service(req, 'cms_batches', trx);
          const batch = await s.readOne(req.params.id);
          if (batch.category !== initial.category)
            throw fail(409, 'Chuyên mục đã thay đổi, hãy tải lại.');
          await allowed(req, batch.category, 'can_publish', trx);
          if (batch.status === 'published') return;
          if (!['draft', 'archived'].includes(batch.status) || !batch.row_count)
            throw fail(409, 'Phiên bản không thể công bố.');
          const old = await s.readByQuery({
            filter: {
              category: { _eq: batch.category },
              period: { _eq: batch.period },
              status: { _eq: 'published' },
            },
            fields: ['id'],
            limit: -1,
          });
          for (const b of old)
            await s.updateOne(
              b.id,
              { status: 'archived' },
              { emitEvents: false },
            );
          await s.updateOne(
            batch.id,
            { status: 'published', published_at: new Date().toISOString() },
            { emitEvents: false },
          );
        });
        res.json({ data: { id: req.params.id, status: 'published' } });
      }),
    );
    router.get(
      '/dashboard/:category',
      wrap(async (req: any, res: any) => {
        await allowed(req, req.params.category, 'can_read');
        if (req.query.period && !validatePeriod(String(req.query.period)))
          throw fail(400, 'Kỳ báo cáo không hợp lệ.');
        const s = await service(req, 'cms_batches');
        const data = await s.readByQuery({
          filter: {
            category: { _eq: req.params.category },
            status: { _eq: 'published' },
            ...(req.query.period
              ? { period: { _eq: String(req.query.period) } }
              : {}),
          },
          fields: ['id', 'category', 'period', 'records', 'published_at'],
          sort: ['-published_at', '-id'],
          limit: 1,
        });
        if (!data.length) throw fail(404, 'Chưa có dữ liệu được công bố.');
        res.json({ data: dashboardPayload(data[0]) });
      }),
    );
  },
};

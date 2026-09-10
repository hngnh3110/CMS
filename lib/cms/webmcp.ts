import { catalog, type Batch } from './catalog';
export function registerCmsTools(actions: {
  navigate: (page: string) => void;
  getBatches: () => Batch[];
}) {
  const context = (document as any).modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const tools = [
    {
      name: 'vtv_list_import_batches',
      title: 'Danh sách phiên bản CMS',
      description: 'Đọc các phiên bản hiện có trong không gian CMS hiện tại.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input: unknown) {
        if (!input || typeof input !== 'object' || Object.keys(input).length)
          throw Error('Không nhận tham số.');
        return {
          batches: actions
            .getBatches()
            .map(({ id, category, period, status, filename }) => ({
              id,
              category,
              period,
              status,
              filename,
            })),
        };
      },
    },
    {
      name: 'vtv_open_category',
      title: 'Mở chuyên mục CMS',
      description:
        'Chuyển sang danh sách dữ liệu một chuyên mục; không thay đổi dữ liệu.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: catalog.map((c) => c.id) },
        },
        required: ['category'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: any) {
        if (
          !input ||
          Object.keys(input).length !== 1 ||
          !catalog.some((c) => c.id === input.category)
        )
          throw Error('Chuyên mục không hợp lệ.');
        actions.navigate(input.category);
        return { opened: input.category };
      },
    },
  ];
  for (const tool of tools)
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  return () => lifecycle.abort();
}

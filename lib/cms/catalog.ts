export const catalog = [
  {
    id: 'bctc',
    name: 'Báo cáo tài chính',
    group: 'Tài chính',
    color: '#ba5936',
    icon: 'finance',
    description: 'Bảng cân đối kế toán và chỉ tiêu tài chính',
    unit: 'tỷ đồng',
    formats: '.xlsx, .xls, .csv, .docx',
  },
  {
    id: 'dautu',
    name: 'Đầu tư công',
    group: 'Tài chính',
    color: '#c23937',
    icon: 'investment',
    description: 'Kế hoạch vốn và tiến độ giải ngân',
    unit: 'triệu đồng',
    formats: '.xlsx, .xls, .csv',
  },
  {
    id: 'eoffice',
    name: 'Tổng quan & Sử dụng',
    group: 'Văn phòng điện tử',
    color: '#7452bd',
    icon: 'office',
    description: 'Văn bản và tình hình sử dụng hệ thống',
    unit: 'văn bản',
    formats: '.xlsx, .xls, .csv',
  },
  {
    id: 'vanban',
    name: 'Tiến độ xử lý văn bản',
    group: 'Văn phòng điện tử',
    color: '#9e49b0',
    icon: 'document',
    description: 'Theo dõi văn bản đúng hạn và quá hạn',
    unit: 'văn bản',
    formats: '.xlsx, .xls, .csv',
  },
  {
    id: 'nhiemvu',
    name: 'Nhiệm vụ tổng quan',
    group: 'Văn phòng điện tử',
    color: '#28996a',
    icon: 'task',
    description: 'Tổng hợp nhiệm vụ và kết quả thực hiện',
    unit: 'nhiệm vụ',
    formats: '.xlsx, .xls, .csv',
  },
] as const;
export type Category = (typeof catalog)[number]['id'];
export type RecordRow = Record<string, string | number | null>;
export type Batch = {
  id: string;
  category: Category;
  filename: string;
  period: string;
  status: 'draft' | 'published' | 'archived';
  records: RecordRow[];
  row_count: number;
  date_created: string;
  published_at?: string;
  user_name?: string;
  source_hash?: string;
  notes?: string;
};
export type RequestFn = (
  path: string,
  options?: { method?: string; body?: unknown },
) => Promise<any>;
export const demoBatches: Batch[] = [
  {
    id: 'demo-1',
    category: 'bctc',
    filename: 'Bao_cao_tai_chinh_Q2_2026.xlsx',
    period: '2026-Q2',
    status: 'published',
    records: [
      { code: '100', name: 'Tài sản ngắn hạn', opening: 1200, closing: 1350 },
    ],
    row_count: 1,
    date_created: '2026-09-10T01:15:00Z',
    user_name: 'Người nhập mẫu',
  },
  {
    id: 'demo-2',
    category: 'dautu',
    filename: 'Giai_ngan_thang_08_2026.xlsx',
    period: '2026-08',
    status: 'draft',
    records: [
      { code: 'DA01', name: 'Dự án minh họa', planned: 1000, disbursed: 250 },
    ],
    row_count: 1,
    date_created: '2026-09-09T09:30:00Z',
    user_name: 'Người nhập mẫu',
  },
  {
    id: 'demo-3',
    category: 'eoffice',
    filename: 'Su_dung_VPDT_thang_08.xlsx',
    period: '2026-08',
    status: 'published',
    records: [
      {
        code: 'DV01',
        name: 'Đơn vị minh họa',
        incoming: 100,
        outgoing: 50,
        users: 20,
      },
    ],
    row_count: 1,
    date_created: '2026-09-09T07:20:00Z',
    user_name: 'Người nhập mẫu',
  },
  {
    id: 'demo-4',
    category: 'vanban',
    filename: 'Tien_do_van_ban_thang_08.xlsx',
    period: '2026-08',
    status: 'draft',
    records: [
      {
        code: 'DV01',
        name: 'Đơn vị minh họa',
        total: 100,
        ontime: 80,
        overdue: 5,
        processing: 15,
      },
    ],
    row_count: 1,
    date_created: '2026-09-08T08:00:00Z',
    user_name: 'Người nhập mẫu',
  },
  {
    id: 'demo-5',
    category: 'nhiemvu',
    filename: 'Tong_hop_nhiem_vu_thang_08.xlsx',
    period: '2026-08',
    status: 'published',
    records: [
      {
        code: 'DV01',
        name: 'Đơn vị minh họa',
        total: 20,
        completed: 12,
        overdue: 2,
        processing: 6,
      },
    ],
    row_count: 1,
    date_created: '2026-09-08T02:45:00Z',
    user_name: 'Người nhập mẫu',
  },
];

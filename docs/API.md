# Hợp đồng API VTV CMS, schema_version 1

Base URL là origin Directus riêng của đơn vị. Tất cả endpoint cần phiên Directus hợp lệ hoặc `Authorization: Bearer <token>`. Không có endpoint dữ liệu công khai.

## Đọc từ Dashboard

`GET /vtv/dashboard/{category}?period=2026-09`

`category`: `bctc`, `dautu`, `eoffice`, `vanban`, `nhiemvu`. `period` tùy chọn: `YYYY`, `YYYY-MM`, `YYYY-Q1..Q4`. Bỏ qua kỳ để lấy bản được công bố gần nhất theo thời gian công bố. Mỗi chuyên mục/kỳ có tối đa một phiên bản đang công bố qua quy trình CMS. Không dùng thời điểm nhập để chọn dữ liệu.

Ví dụ cấu trúc (dữ liệu giả định):

```json
{
  "data": {
    "schema_version": 1,
    "category": "bctc",
    "period": "2026-Q2",
    "version": "uuid",
    "published_at": "2026-09-10T00:00:00Z",
    "unit": "tỷ đồng",
    "summary": {
      "indicators": {
        "100": { "name": "Tài sản ngắn hạn", "opening": 1200, "closing": 1350 }
      }
    },
    "records": [
      {
        "code": "100",
        "name": "Tài sản ngắn hạn",
        "opening": 1200,
        "closing": 1350
      }
    ]
  }
}
```

BCTC giữ chỉ tiêu theo mã số; **không cộng tất cả dòng** vì có chỉ tiêu cha/con. API không trả tên tệp, SHA, ID tệp gốc, email hay danh tính người nhập. Các chuyên mục khác có trường số được mô tả trong `lib/cms/importer.ts` và các tệp mẫu tải từ giao diện. Trường số chưa cung cấp được biểu diễn `null`, không tự coi là 0.

Phản hồi 401: chưa xác thực; 403: không có quyền chuyên mục; 404: chưa có bản công bố cho kỳ; 400: tham số sai. Client phải giữ trạng thái “chưa có dữ liệu” hoặc dữ liệu cũ có nhãn thời điểm, không tự thay bằng số 0. API dùng `Cache-Control: no-store` để không trả bản nháp/phiên bản cũ từ cache chia sẻ.

Tạo tài khoản dịch vụ với vai trò `VTV · Dashboard API` trong Directus; gán static token bằng chức năng quản trị Directus và lưu token chỉ trên máy chủ Dashboard. Có thể thay bằng đăng nhập/refresh phiên; không dùng tài khoản quản trị hệ thống để đọc báo cáo.

## Quản trị

- `GET /vtv/info`: quyền theo chuyên mục và trạng thái cấu hình SSO (không có bí mật).
- `GET /vtv/batches?offset=0`: tối đa 100 bản, trả `meta.next_offset` cho trang sau. Chỉ lĩnh vực được nhập/công bố.
- `GET /vtv/batches/{id}`: metadata và toàn bộ bản ghi của một phiên bản.
- `POST /vtv/preview`: đọc/kiểm tra tệp, chưa ghi dữ liệu.
- `POST /vtv/imports`: máy chủ đọc lại tệp gốc, chặn lỗi và trùng, lưu tệp và bản nháp.
- `POST /vtv/batches/{id}/publish`: công bố hoặc khôi phục bản lưu trữ. Bản đang công bố của cùng kỳ/chuyên mục được chuyển sang lưu trữ trong cùng giao dịch.

Body preview/import:

```json
{
  "category": "bctc",
  "period": "2026-Q2",
  "filename": "B01-DN.xlsx",
  "content": "BASE64_BYTES",
  "sourceUnit": "ty",
  "numberLocale": "vi",
  "sheet": "Du lieu",
  "notes": "Ghi chú không bắt buộc"
}
```

`sourceUnit`: `dong`, `trieu`, `ty`; chỉ tác động trường tiền trong BCTC/đầu tư. BCTC chuẩn hóa thành tỷ đồng, đầu tư thành triệu đồng. `numberLocale`: `vi` hoặc `en`, chỉ cần cho các ô lưu dưới dạng văn bản. Chọn một sheet; giao diện hiển thị cảnh báo khi workbook có nhiều sheet. DOCX chỉ chấp nhận cho BCTC, đọc bảng theo hàng tiêu đề.

Preview trả records hợp lệ, errors có số dòng và nội dung, warnings, sheets, sheet đang chọn, columns, rowCount, unit. HTTP 422 nếu định dạng không đọc được; nếu bảng đọc được nhưng có lỗi dòng thì trả 200 kèm errors và không cho lưu. `POST /imports` với lỗi dòng trả 422. Trùng nguồn/kỳ/sheet/đơn vị trả 409. Payload tối đa 8 MB; file tối đa 5 MB.

## Phân quyền và giao dịch

`cms_grants` lưu quyền trên category cho từng role Directus; kế thừa các role cha theo cơ chế cộng quyền. Quyền can_read chỉ đọc dữ liệu đã công bố. can_import/can_publish được kiểm tra riêng.

Không cấp quyền REST thông thường ghi `cms_batches`, `cms_grants`, đọc tệp gốc cho các vai trò nghiệp vụ. Endpoint kiểm tra người dùng, chuyên mục, thao tác, dữ liệu, sau đó dùng ItemsService có đặc quyền giới hạn trong endpoint; giữ user/IP/accountability gốc để Directus ghi activity/revisions. Không nhận collection, status, id người nhập hoặc file storage từ client.

Publication khóa hàng chuyên mục trong PostgreSQL và cập nhật trạng thái trong một transaction. Tệp vật lý được lưu trước transaction nhập; nếu transaction thất bại, xóa tệp mới tạo. Nếu giao dịch đã commit nhưng trả response lỗi, không xóa tệp; client có thể tải lại lịch sử hoặc nhận 409 khi thử nhập lại. Extension tắt emitEvents cho batch mutations để tránh Flow gửi thông báo trước commit; muốn thêm Flow cần phát sự kiện sau commit.

## Tương thích mẫu Văn phòng điện tử hiện có

Đã đối chiếu trực tiếp ba mẫu tải từ Dashboard qua Safari ngày 10/09/2026: `Mau-bao-cao-tong-hop.xlsx`, `Mau-bao-cao-KPI-don-vi.xlsx`, `Mau-bao-cao-nhiem-vu-don-vi.xlsx`. Adapter nhận diện hàng tiêu đề gốc (gồm tiêu đề nhiều tầng), giữ các trường chi tiết và ID nhiệm vụ. Những tệp nguồn này chỉ được đọc cục bộ để thử tương thích, không đưa vào mã nguồn hoặc bản Sites.

- `eoffice`: giữ số người dùng, truy cập, văn bản đến/đi theo từng luồng, nhiệm vụ đơn vị/cá nhân, phòng họp và lịch họp. Các tỷ lệ gốc lưu dưới khóa `source_*`; `usage_rate` và `electronic_outgoing_rate` được tính lại từ tử số/mẫu số.
- `vanban`: giữ riêng nhóm `incoming_*`, `outgoing_*`, `submissions_*`, `dossiers_*`. Các trường chuẩn `total/ontime/overdue/processing` là nhóm **văn bản đến**, không cộng bốn loại khác nhau. Chênh lệch tổng phân loại gốc được báo cảnh báo để người công bố xem xét.
- `nhiemvu`: mỗi dòng là một nhiệm vụ; `code` lấy từ ID nhiệm vụ. Giữ tên, đơn vị chủ trì, ngày hạn, kết quả, mức độ hoàn thành và các chi tiết gốc. Thống kê hoàn thành/chậm/đang thực hiện dựa trên trạng thái tường minh; trạng thái lạ bị chặn, không tự suy đoán theo ngày hiện tại. Email/số điện thoại người phê duyệt không trả trong API Dashboard.

Với hai bảng tổng hợp, hàng dữ liệu đầu có STT 1 và tên chính xác `Đài Truyền hình Việt Nam` được gắn `scope:total` theo mô tả trang nhập Dashboard. API summary ưu tiên hàng tổng này; không cộng nó lần nữa với chi tiết đơn vị. Các hàng còn lại có `scope:unit`; nhiệm vụ có `scope:task`. `aggregation` cho biết `reported_total`, `sum_rows` hoặc `by_indicator`. `reporting_range` giữ khoảng ngày thống kê nếu đọc được từ tiêu đề. Người nhập vẫn chọn period quản lý và cần đối chiếu khoảng ngày trong cảnh báo.

Ô số trống trong ba mẫu cũ được hiểu là 0 và được cảnh báo trong màn hình kiểm tra. Mẫu chuẩn CMS dùng kiểm tra chặt hơn, không tự điền ô bắt buộc bị bỏ trống. Với BCTC/đầu tư chưa có tệp mẫu gốc để kiểm chứng toàn bộ bố cục, dùng mẫu chuẩn hoặc tên cột được hỗ trợ; bổ sung adapter sau khi có mẫu thực tế của đơn vị.

# VTV CMS · Directus

Hệ thống quản trị riêng cho 5 chuyên mục của Dashboard VTV, gồm một **module chạy trong Directus**, một **endpoint extension**, cấu hình PostgreSQL/Docker, phân quyền và đầu chờ SSO. Giao diện React dùng chung cho module Directus và bản xem trước Sites.

## Mở hệ thống

- Directus cục bộ: http://localhost:8055/admin/vtv-cms
- Trên máy Mac đã cài bộ chạy, bấm đúp **Mo CMS.command** để mở. Có thêm **Kiem tra CMS.command**, **Khoi dong lai CMS.command** và **Dung CMS.command**. Dịch vụ chạy nền, tự mở khi đăng nhập macOS; không cần giữ Terminal mở.
- Xem **[hướng dẫn sử dụng chi tiết](docs/HUONG_DAN_SU_DUNG.md)**: đăng nhập, nhập tệp, kiểm tra, công bố, khôi phục, phân quyền, API/SSO, sao lưu và xử lý lỗi.
- Tài khoản quản trị cục bộ nằm trong `.env` (ADMIN_EMAIL / ADMIN_PASSWORD). Không đưa `.env` vào Git. Thay hai biến này không cập nhật tài khoản đã tồn tại; đổi tài khoản/mật khẩu qua Directus.
- Bản xem trước giao diện chạy từ `pnpm dev`. Đây là chế độ **dữ liệu minh họa trong bộ nhớ**, không phải cơ sở dữ liệu sản xuất; tải lại trang sẽ khôi phục dữ liệu mẫu. Tệp được xử lý trên trình duyệt và không gửi tới máy chủ Sites.
- Directus thật khởi đầu không có báo cáo mẫu. Các mẫu dùng kiểm thử đã được dọn sau kiểm tra.

## Chức năng

| Nhóm              | Chuyên mục               | API category | Đường dẫn Dashboard hiện có |
| ----------------- | ------------------------ | ------------ | --------------------------- |
| Tài chính         | Báo cáo tài chính B01-DN | `bctc`       | `#/bctc`                    |
| Tài chính         | Đầu tư công              | `dautu`      | `#/dautu`                   |
| Văn phòng điện tử | Tổng quan & Sử dụng      | `eoffice`    | `#/eoffice`                 |
| Văn phòng điện tử | Tiến độ xử lý văn bản    | `vanban`     | `#/eoffice/sla`             |
| Văn phòng điện tử | Nhiệm vụ tổng quan       | `nhiemvu`    | `#/nhiemvu`                 |

Luồng: tải mẫu → chọn tệp Excel/CSV/Word → chọn kỳ, đơn vị tiền và quy ước số → kiểm tra → lưu bản nháp → người công bố kiểm tra và phát hành. Có lịch sử, tìm kiếm/lọc, xem dữ liệu, xuất JSON và khôi phục phiên bản. Tệp gốc lưu riêng trong Directus Files; người dùng thông thường không được đọc tệp qua URL công khai.

Đã bổ sung đọc trực tiếp ba mẫu Văn phòng điện tử tải từ Dashboard hiện có, gồm bảng tổng hợp, KPI đơn vị và danh sách nhiệm vụ.

Hỗ trợ `.xlsx`, `.xls`, `.csv`; `.docx` chỉ cho bảng B01-DN. Tối đa 5 MB, 5.000 dòng, 100 cột và 32 MB nội dung giải nén. Không tính lại công thức Excel: ô có công thức bị chặn để tránh số liệu từ bộ nhớ đệm đã cũ. Số dạng Việt Nam và quốc tế được chọn rõ; tiền được quy đổi theo đơn vị người nhập chọn. Mỗi lần nhập giữ tệp gốc, SHA-256, phiên bản và danh tính người nhập.

## Triển khai máy chủ riêng

Yêu cầu Docker Compose, cổng HTTPS/reverse proxy của đơn vị và quyền sử dụng Directus phù hợp. Bản thử dùng SQLite; bản Docker dùng PostgreSQL.

1. Sao chép `.env.example` thành `.env` **trên máy chủ mới**. Điền `DB_PASSWORD`, `SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` bằng giá trị riêng. Đặt `PUBLIC_URL=https://<cms-host>`, `SESSION_COOKIE_SECURE=true`, `CORS_ORIGIN` đúng miền Dashboard. Để `AUTH_PROVIDERS` trống khi chưa có SSO.
2. Chạy:
   ```sh
   docker compose up -d --build
   docker compose --profile setup run --rm setup
   ```
3. Mở `https://<cms-host>/admin/vtv-cms`. Module VTV CMS nằm trong thanh điều hướng Directus; giao diện dùng phiên đăng nhập Directus hiện tại.
4. Tạo người dùng trong Directus và gán vai trò đã tạo: nhập tài chính, nhập văn phòng, người công bố hoặc tài khoản Dashboard API. Không gán thêm chính sách rộng cho những vai trò này. `cms_grants` là nơi quản trị viên điều chỉnh phạm vi chuyên mục.
5. Đặt reverse proxy trước `127.0.0.1:8055`, giới hạn request body ít nhất 8 MB để chứa base64 của tệp 5 MB. Chỉ proxy HTTPS được công khai. Sao lưu đồng thời PostgreSQL và volume `uploads`.

Bootstrap thêm collection/field/role còn thiếu, giữ nguyên quyền đã chỉnh và có thể chạy lại. Không tự mở quyền public, không tự tạo tài khoản SSO hoặc tài khoản API có token, không ghi đè dữ liệu báo cáo hiện có. Phiên bản triển khai khóa Directus `11.17.4` và PostgreSQL `16.10-alpine`; kiểm tra cập nhật bảo mật trước phát hành thực tế.

## Kết nối Dashboard

Xem [hợp đồng API](docs/API.md), [ví dụ gọi phía máy chủ](examples/dashboard-server.ts) và [SSO](docs/SSO.md). Dashboard hiện tại chưa bị thay đổi. Đội phát triển cần đưa hàm gọi CMS vào lớp API hiện có rồi ánh xạ `records` / `summary` vào biểu đồ. Không đặt token Directus vào JavaScript gửi tới trình duyệt, URL hay kho mã nguồn.

Directus API được cung cấp bởi extension tại `/vtv/*`. Dữ liệu được công bố qua endpoint riêng; việc cho phép đọc các collection thô qua `/items/*` không thay thế hợp đồng này.

## Phát triển và kiểm tra

Node 22 được dùng cho Directus 11.17.4; không dùng Node 24 cho `isolated-vm` của bản này.

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build:directus
pnpm build
```

Để chạy backend không có Docker: cài riêng `directus@11.17.4` và `sqlite3@5.1.7` bằng Node 22, rồi đặt `DIRECTUS_CLI` tới `directus/cli.js`:

```sh
node directus/scripts/run-local.mjs bootstrap
node directus/scripts/run-local.mjs start
node --env-file=.env directus/scripts/bootstrap.mjs
```

`run-local.mjs` dùng `.runtime/data.db`, `.runtime/uploads`, chỉ lắng nghe loopback. Nó nhận `DIRECTUS_CLI` hoặc tìm bộ Directus tại `.runtime/directus/node_modules/directus/cli.js`. Trên máy Mac hiện tại, Node 22 và Directus đã được đặt ở `.runtime/node22` và `.runtime/directus`; `local-service.mjs` quản lý dịch vụ launchd độc lập với Terminal và tự chạy khi đăng nhập. Bộ chạy và dữ liệu cục bộ không nằm trong Git; máy mới cần cài riêng hoặc dùng Docker. Xem hướng dẫn vận hành ở cuối [tài liệu sử dụng](docs/HUONG_DAN_SU_DUNG.md).

Kiểm tra tích hợp chỉ cho instance localhost dành cho thử nghiệm:

```sh
RUN_DIRECTUS_INTEGRATION=1 pnpm exec tsx tests/directus.integration.ts
```

Bộ kiểm tra tự tạo người dùng/báo cáo thử và dọn chúng trong `finally`. Nhật ký thử vẫn được giữ để đối chiếu. Xem [kết quả kiểm tra và giới hạn](docs/VALIDATION.md).

## Giấy phép Directus

Directus 11.17.4 dùng **BUSL-1.1**, không phải giấy phép Open Source theo định nghĩa OSI. Giấy phép cho phép đánh giá/phát triển/thử nghiệm; điều kiện vận hành miễn phí phụ thuộc “Total Finances” của tổ chức và đơn vị liên quan không vượt US$5 triệu trong 12 tháng gần nhất. Đơn vị cần kiểm tra điều kiện hoặc có giấy phép thương mại trước khi vận hành. Không mặc định VTV đáp ứng điều kiện này.

Nguồn: [giấy phép chính xác của 11.17.4](https://github.com/directus/directus/blob/v11.17.4/license), [bản phát hành](https://github.com/directus/directus/releases/tag/v11.17.4). Directus 12 thay đổi cơ chế giấy phép và giới hạn SSO/quy tắc phân quyền; không tự nâng major version mà chưa kiểm tra và thử nghiệm: [ghi chú v12](https://github.com/directus/directus/releases/tag/v12.0.0).

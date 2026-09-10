# Kiểm tra và giới hạn bàn giao

Ngày kiểm tra: 10/09/2026.

- 16 unit tests đọc/kiểm tra tệp: mẫu của đủ 5 mục, số Việt Nam/quốc tế, alias B01-DN, quy đổi tiền, mã trùng, ô thiếu, kỳ sai, công thức, tổng tiến độ không khớp, chọn sheet, Word, kích thước, ZIP nén lớn/kích thước giả và numeric overflow.
- TypeScript kiểm tra thành công.
- Đã build module Directus và endpoint extension, cũng như bản xem trước Sites.
- Directus **11.17.4 thật** chạy Node22/SQLite cục bộ: 35 kiểm tra HTTP đạt, gồm 401 chưa đăng nhập, 403 sai lĩnh vực, chặn đọc file gốc, import/preview, trùng 409, draft không xuất ra API, quyền publish, công bố đồng thời, chỉ một bản published cùng kỳ, khôi phục và audit đúng người thao tác. Fixture tạo trong bài test đã được dọn.
- Kiểm tra PostgreSQL/Docker Compose chưa chạy trong môi trường này vì chưa có Docker; cấu hình triển khai đã có. Cần chạy lại kiểm tra tích hợp/staging trên PostgreSQL của đơn vị trước vận hành.
- Chưa có cấu hình IdP thật nên chưa kiểm tra OIDC/SAML đầu cuối.
- Dashboard thật chỉ được đọc để đối chiếu đường dẫn và mẫu, chưa sửa mã hoặc thay nguồn dữ liệu của hệ thống đang vận hành.
- Không thực hiện QA tương tác/ảnh chụp trình duyệt; đã kiểm tra biên dịch và HTTP. WebMCP có đăng ký hai công cụ đọc/mở chuyên mục, nhưng môi trường không có context hỗ trợ để xác thực hợp đồng chạy thực tế; không coi là chức năng cần thiết cho vận hành CMS.

Bản Sites là bản xem trước giao diện xử lý trong bộ nhớ trình duyệt. Backend Directus chạy trên máy chủ riêng/cục bộ; không được triển khai trong Cloudflare Worker của Sites.

Đã đọc trực tiếp cả ba tệp mẫu Văn phòng điện tử gốc: mẫu tổng hợp đọc 4 dòng, mẫu KPI 4 dòng, mẫu nhiệm vụ 2 dòng, không còn lỗi; nhận diện đúng hàng tổng của 2 bảng tổng hợp. Đây là kiểm tra parser trên file cục bộ, không phải tải dữ liệu mẫu lên Site.

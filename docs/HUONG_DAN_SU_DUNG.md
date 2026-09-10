# Hướng dẫn sử dụng VTV CMS

Áp dụng cho bản Directus trong thư mục `/Users/luc1fxr/CMS`, cập nhật ngày 10/09/2026.

## 1. Mở hệ thống trên máy Mac này

Địa chỉ CMS: **[http://localhost:8055/admin/vtv-cms](http://localhost:8055/admin/vtv-cms)**.

Tài khoản quản trị hiện tại: **admin@gmail.com**. Dùng mật khẩu đã đặt riêng cho tài khoản này; tài liệu không lưu mật khẩu. Đây là tài khoản của CMS, không phải đăng nhập qua Google.

1. Mở Safari, Chrome hoặc trình duyệt trong ứng dụng, vào địa chỉ trên.
2. Nếu thấy trang **Đăng nhập**, điền email và mật khẩu rồi bấm **Đăng nhập**.
3. Sau khi đăng nhập, mở module **VTV CMS** nếu Directus đang hiển thị màn hình quản trị chung.
4. Lưu địa chỉ này vào dấu trang để mở lại.

Directus có thể hiện lời nhắc **Project Owner** ở lần đăng nhập đầu. Nếu đang kiểm tra bản cục bộ, có thể chọn **Remind Later** khi nút này xuất hiện để tiếp tục. Việc khai báo chủ dự án và chấp nhận điều khoản do người phụ trách hệ thống thực hiện.

Nếu trình duyệt báo không thể kết nối, mở Finder → thư mục **CMS** → bấm đúp **Mo CMS.command**. Đợi thông báo **CMS đã sẵn sàng**. Tệp này cũng mở CMS trong trình duyệt mặc định. Có thể đóng cửa sổ Terminal sau đó, dịch vụ vẫn chạy nền.

| Tệp trong thư mục CMS | Khi nào dùng |
| --- | --- |
| `Mo CMS.command` | Khởi động nếu chưa chạy, kiểm tra dịch vụ và mở trang CMS. |
| `Kiem tra CMS.command` | Xem trạng thái cổng 8055 và vị trí nhật ký. |
| `Khoi dong lai CMS.command` | Khởi động lại khi vừa sửa cấu hình hoặc dịch vụ bị lỗi. |
| `Dung CMS.command` | Dừng dịch vụ, ví dụ trước khi sao lưu. Mở lại bằng `Mo CMS.command`. |

Dịch vụ được cấu hình tự mở khi tài khoản macOS này đăng nhập. Đóng trình duyệt hoặc Terminal không dừng CMS. Máy tắt, đăng xuất hoặc ngủ thì không thể coi đây là máy chủ luôn sẵn sàng; sau khi bật máy và đăng nhập, chờ dịch vụ khởi động. Dùng **Dừng CMS** chỉ dừng phiên hiện tại; lần đăng nhập Mac tiếp theo dịch vụ vẫn tự mở.

**Phạm vi truy cập:** `localhost` là chính máy đang dùng. Địa chỉ này hiện chỉ truy cập được trên máy Mac cài CMS. Máy khác, điện thoại và Dashboard trên máy chủ VTV không thể gọi địa chỉ localhost của máy Mac này. Để sử dụng chung, cần triển khai CMS lên máy chủ và cấp tên miền HTTPS theo README.

Cổng **8055** là CMS thật và API. Bản xem trước giao diện chạy bằng `pnpm dev` hoặc trên Sites dùng dữ liệu minh họa trong bộ nhớ; tải lại trang có thể khôi phục dữ liệu mẫu. Dùng địa chỉ 8055 để quản lý dữ liệu được lưu vào Directus.

## 2. Nhận biết các màn hình

| Mục bên trái | Chức năng |
| --- | --- |
| Tổng quan | Xem số chuyên mục, bản công bố, bản nháp và các lần nhập gần đây. |
| Tài chính → Báo cáo tài chính | Quản lý bảng cân đối kế toán B01-DN và chỉ tiêu theo mã số. |
| Tài chính → Đầu tư công | Quản lý kế hoạch vốn và số đã giải ngân. |
| Văn phòng điện tử → Tổng quan & Sử dụng | Quản lý số liệu văn bản, người dùng và mức sử dụng hệ thống. |
| Văn phòng điện tử → Tiến độ xử lý văn bản | Quản lý số lượng và tình trạng xử lý văn bản. |
| Văn phòng điện tử → Nhiệm vụ tổng quan | Quản lý số liệu nhiệm vụ và kết quả thực hiện. |
| Lịch sử nhập liệu | Tìm phiên bản, xem nội dung, công bố hoặc khôi phục theo quyền. |
| Kết nối API | Xem địa chỉ API theo chuyên mục và ví dụ dành cho đội phát triển Dashboard. |

Nút **Directus** đưa về màn hình quản trị gốc. Quản lý tài khoản nằm tại [http://localhost:8055/admin/users](http://localhost:8055/admin/users), hoặc nút **Quản lý tài khoản** trong phần kết nối API. Các thao tác hiện ra phụ thuộc vai trò của tài khoản. Phần SSO đang tạm ẩn và có thể bật lại khi cần.

## 3. Chuẩn bị tệp báo cáo

Nên bấm **Nhập dữ liệu → chọn chuyên mục → Tải mẫu** để lấy đúng tệp Excel. Điền dữ liệu và giữ hàng tiêu đề. Mỗi lần nhập chọn **một chuyên mục, một kỳ và một trang tính**.

### Định dạng và nội dung

| Chuyên mục | Định dạng hỗ trợ | Các cột chính của mẫu chuẩn CMS |
| --- | --- | --- |
| Báo cáo tài chính | `.xlsx`, `.xls`, `.csv`, `.docx` | Mã số; Tên chỉ tiêu; Số đầu kỳ; Số cuối kỳ. DOCX phải chứa bảng B01-DN đọc được. |
| Đầu tư công | `.xlsx`, `.xls`, `.csv` | Mã số; Tên chỉ tiêu; Nguồn vốn (không bắt buộc); Kế hoạch vốn; Đã giải ngân. |
| Tổng quan & Sử dụng | `.xlsx`, `.xls`, `.csv` | Mã số; Tên chỉ tiêu; Văn bản đến; Văn bản đi; Tổng người dùng. Mẫu có thêm các cột tùy chọn về hoạt động, văn bản điện tử, họp và phòng họp. |
| Tiến độ xử lý văn bản | `.xlsx`, `.xls`, `.csv` | Mã số; Tên chỉ tiêu; Tổng văn bản; Đúng hạn; Quá hạn; Đang xử lý. |
| Nhiệm vụ tổng quan | `.xlsx`, `.xls`, `.csv` | Mã số; Tên chỉ tiêu; Tổng nhiệm vụ; Hoàn thành; Chậm tiến độ; Đang thực hiện. |

Với các chuyên mục đơn vị/dự án, cột **Tên chỉ tiêu** dùng để ghi tên đơn vị/dự án tương ứng. Mã phải có giá trị và không trùng trong cùng bảng. Các cột bắt buộc không được bỏ trống.

Hệ thống cũng đã có bộ đọc riêng cho ba mẫu Văn phòng điện tử lấy từ Dashboard: `Mau-bao-cao-tong-hop.xlsx`, `Mau-bao-cao-KPI-don-vi.xlsx`, `Mau-bao-cao-nhiem-vu-don-vi.xlsx`. Mẫu nhiệm vụ cũ là danh sách từng nhiệm vụ, khác cấu trúc bảng tổng hợp trong mẫu chuẩn CMS; bộ đọc tự nhận diện theo tiêu đề. Không đổi tùy ý tiêu đề của các mẫu cũ này.

Với BCTC và đầu tư công, chưa có tệp gốc của đơn vị để xác nhận mọi bố cục thực tế. Dùng mẫu tải từ CMS trước; nếu tệp cũ không đọc được, chuyển dữ liệu sang mẫu chuẩn hoặc nhờ đội kỹ thuật bổ sung nhận diện mẫu.

### Quy tắc cần kiểm tra trước khi nhập

- Tối đa **5 MB/tệp**, **5.000 dòng dữ liệu**, **100 cột**. Giới hạn nội dung giải nén là 32 MB.
- Không hỗ trợ PDF, ảnh chụp bảng và Word `.doc` cũ. Có thể lưu tài liệu Word thành `.docx`, nhưng vẫn phải có bảng phù hợp với BCTC.
- Ô Excel có công thức sẽ bị chặn. Tạo bản sao báo cáo rồi dùng **Sao chép → Dán đặc biệt → Giá trị** trong Excel trước khi lưu và nhập bản sao.
- Số đếm phải là số nguyên không âm. Số đã giải ngân không vượt kế hoạch vốn trong mẫu chuẩn.
- Đối chiếu tổng và các nhóm thành phần. Dữ liệu mẫu chuẩn phải thỏa kiểm tra của chuyên mục; cảnh báo của mẫu cũ cần người công bố đọc và xác nhận nghiệp vụ.
- BCTC giữ quan hệ chỉ tiêu theo mã số; không tự cộng toàn bộ dòng cha và con để tính tổng tài sản.

## 4. Nhập tệp và lưu bản nháp

Ví dụ: nhập báo cáo tài chính quý III/2026.

1. Chọn **Tài chính → Báo cáo tài chính**.
2. Bấm **Nhập dữ liệu** ở đầu trang. Kiểm tra **Chuyên mục** trong cửa sổ vừa mở.
3. Nhập **Kỳ báo cáo** là `2026-Q3`. Các dạng chấp nhận: `2026` cho năm, `2026-09` cho tháng, `2026-Q3` cho quý. Không nhập `09/2026` hoặc `Quý 3/2026`.
4. Chọn **Quy ước số trong ô văn bản**: **Việt Nam · 1.234,56** hoặc **Quốc tế · 1,234.56**. Tùy chọn này áp dụng khi số trong tệp được lưu dưới dạng chữ; ô số thực của Excel được đọc theo giá trị số.
5. Với tài chính/đầu tư, chọn **Đơn vị tiền trong tệp** đúng với dữ liệu nguồn: Đồng, Triệu đồng hoặc Tỷ đồng. Ví dụ tệp ghi `1500` và đơn vị là triệu đồng thì phải chọn **Triệu đồng**. Hệ thống quy đổi BCTC sang **tỷ đồng**, đầu tư công sang **triệu đồng**.
6. Kéo tệp vào vùng tải lên hoặc bấm **Chọn tệp từ máy tính**.
7. Bấm **Kiểm tra dữ liệu**. Đọc số dòng hợp lệ, lỗi, cảnh báo và bảng xem trước. Bảng chỉ hiển thị tối đa 8 dòng đầu, không có nghĩa chỉ nhập 8 dòng.
8. Nếu tệp có nhiều trang tính, chọn **Trang tính đang nhập**, rồi bấm **Kiểm tra dữ liệu** lại. Chỉ trang tính đang chọn được nhập; hệ thống không tự gộp các trang còn lại.
9. Nếu có lỗi, đọc số dòng và nội dung, sửa tệp bên ngoài, bấm **Chọn lại tệp** và tải lại. Nút lưu bị vô hiệu hóa khi còn lỗi. Nếu có cảnh báo, đối chiếu với báo cáo gốc trước khi tiếp tục.
10. Điền **Ghi chú phiên bản** nếu cần: nguồn số liệu, lý do điều chỉnh, người đối chiếu…
11. Bấm **Lưu bản nháp**. Khi hiện **Đã lưu bản nháp**, đóng cửa sổ và kiểm tra bản ghi trong chuyên mục hoặc lịch sử.

**Lưu bản nháp chưa làm dữ liệu xuất hiện ở API Dashboard.** Tệp gốc, dữ liệu và người nhập được lưu vào Directus để người công bố kiểm tra sau.

Nếu cùng một tệp, chuyên mục, kỳ và lựa chọn nhập đã tồn tại, hệ thống báo trùng. Đổi tên tệp không biến nội dung cũ thành dữ liệu mới. Tìm bản đã nhập trong lịch sử; khi cần sửa, chỉnh số liệu trong tệp rồi nhập phiên bản mới.

## 5. Kiểm tra và công bố dữ liệu

Tài khoản quản trị hoặc vai trò **VTV · Người công bố** thực hiện bước này.

1. Vào chuyên mục hoặc **Lịch sử nhập liệu**.
2. Lọc trạng thái **Bản nháp**. Tìm theo tên tệp hoặc kỳ báo cáo.
3. Bấm **tên tệp** để mở **Chi tiết phiên bản**.
4. Đối chiếu chuyên mục, kỳ, số dòng, người nhập, thời gian và ghi chú.
5. Trong tab **Dữ liệu**, xem các cột và số liệu. Màn hình hiển thị tối đa 50 dòng; bấm **Xuất JSON** để lấy toàn bộ dữ liệu dưới dạng JSON nếu cần kiểm tra đầy đủ.
6. Tab **Dạng API** cho xem cấu trúc mà Dashboard sẽ sử dụng. Với bản nháp, đây chỉ là xem trước.
7. Bấm **Công bố phiên bản**, đọc thông báo thay thế, rồi bấm **Xác nhận công bố**.
8. Kiểm tra bản ghi chuyển sang **Đã công bố**.

Mỗi **chuyên mục + kỳ báo cáo** chỉ có một bản đang công bố. Khi công bố bản mới cùng chuyên mục và kỳ, bản trước tự chuyển sang **Lưu trữ**. Các kỳ khác không bị thay thế.

Ví dụ: công bố BCTC `2026-Q3` lần 2 sẽ thay bản BCTC `2026-Q3` lần 1; không thay BCTC `2026-Q2` và không thay Đầu tư công `2026-Q3`.

**Trạng thái thực tế của tích hợp:** dữ liệu đã công bố có thể được đọc qua API CMS. Trang `dashboard.vtv.gov.vn` chưa được sửa để gọi API này. Đội phát triển cần kết nối Dashboard với CMS trước khi việc công bố làm thay đổi số liệu trên trang Dashboard hiện tại.

## 6. Sửa sai và khôi phục phiên bản

### Nhập lại số liệu đã sửa

1. Sửa tệp nguồn ngoài CMS và lưu lại.
2. Nhập thành bản nháp mới, chọn đúng chuyên mục và kỳ cần thay.
3. Kiểm tra và công bố phiên bản mới theo mục 5.

Giao diện hiện dùng quy trình phiên bản; không sửa từng ô trực tiếp và không có nút xóa báo cáo trong module VTV CMS.

### Quay về bản đã công bố trước đó

1. Mở chuyên mục hoặc lịch sử, lọc **Lưu trữ**.
2. Tìm đúng kỳ, bấm tên tệp cũ, kiểm tra dữ liệu.
3. Bấm **Khôi phục và công bố** → **Xác nhận công bố**.
4. Bản cũ trở thành bản đang công bố; bản đang công bố trước thao tác này chuyển sang lưu trữ.

Khôi phục giữ lại lịch sử các phiên bản. Không cần tải lại cùng tệp cũ để khôi phục.

## 7. Tra cứu lịch sử và xuất dữ liệu

- Chọn một chuyên mục để xem riêng lĩnh vực đó, hoặc **Lịch sử nhập liệu** để xem toàn bộ phạm vi được cấp quyền.
- Dùng ô tìm kiếm theo tên tệp, tên chuyên mục hoặc kỳ như `2026-09`.
- Dùng bộ lọc **Bản nháp / Đã công bố / Lưu trữ**.
- Nếu có nút **Tải thêm**, tải các phiên bản cũ hơn rồi tìm/lọc tiếp. Tìm kiếm hiện áp dụng cho các bản đã tải vào giao diện.
- Bấm tên tệp để xem chi tiết; bấm **Xuất JSON** để tải dữ liệu đã chuẩn hóa. Đây không phải nút tải lại tệp Excel/Word gốc.

Ba trạng thái có ý nghĩa khác nhau:

| Trạng thái | API Dashboard trả dữ liệu? | Việc tiếp theo |
| --- | --- | --- |
| Bản nháp | Chưa | Kiểm tra rồi công bố khi số liệu đúng. |
| Đã công bố | Có, nếu tài khoản gọi API có quyền và chọn đúng kỳ | Tiếp tục sử dụng hoặc thay bằng phiên bản mới. |
| Lưu trữ | Không trả qua endpoint Dashboard thông thường | Xem lại hoặc khôi phục khi cần. |

## 8. Tạo tài khoản và phân quyền

Quản trị viên mở **Directus → Quản lý người dùng** hoặc [trang người dùng](http://localhost:8055/admin/users).

1. Bấm nút tạo người dùng mới.
2. Điền email, tên hiển thị và mật khẩu riêng cho người dùng.
3. Đặt trạng thái hoạt động (**Active**) và chọn vai trò phù hợp.
4. Lưu tài khoản. Người dùng dùng email/mật khẩu được cấp để đăng nhập CMS.
5. Kiểm tra bằng tài khoản đó: chỉ nhập đúng lĩnh vực được giao; quyền công bố phải đúng trách nhiệm.

| Vai trò đã chuẩn bị | Quyền mặc định |
| --- | --- |
| Administrator | Quản trị hệ thống, người dùng, phân quyền, nhập và công bố cả 5 chuyên mục. |
| VTV · Nhập liệu tài chính | Nhập và xem phiên bản của BCTC, Đầu tư công; không công bố. |
| VTV · Nhập liệu văn phòng | Nhập và xem phiên bản của 3 chuyên mục Văn phòng điện tử; không công bố. |
| VTV · Người công bố | Xem, công bố và khôi phục cả 5 chuyên mục; không nhập tệp theo mặc định. |
| VTV · Dashboard API | Tài khoản dịch vụ chỉ đọc dữ liệu đã công bố; không vào giao diện quản trị. |

Quyền theo chuyên mục nằm trong collection **cms_grants**: vai trò, chuyên mục, quyền đọc, nhập, công bố. Chỉ quản trị viên điều chỉnh khi có nhu cầu phân quyền. Không cấp thêm quyền đọc/ghi collection dữ liệu thô để thay thế quy trình của module.

Nếu một người cần cả nhập và công bố, quản trị viên cần cấp rõ cả hai quyền trong phạm vi được giao. Đăng nhập thành công không tự có quyền mọi chuyên mục.

Muốn đổi mật khẩu đang dùng, mở hồ sơ người dùng trong Directus và lưu mật khẩu mới. Chỉ sửa `ADMIN_PASSWORD` trong `.env` không đổi mật khẩu tài khoản đã tồn tại trong cơ sở dữ liệu; biến này dùng cho khởi tạo. Chức năng **Quên mật khẩu** cần dịch vụ email được cấu hình, không mặc định hoạt động ở bản cục bộ.

## 9. Kết nối API với Dashboard — dành cho đội kỹ thuật

Trong CMS, mở **Kết nối API**, chọn chuyên mục để xem endpoint. Dùng tài khoản dịch vụ có vai trò **VTV · Dashboard API**, cấp token trong Directus và lưu token ở máy chủ Dashboard.

| Chuyên mục | Đường dẫn API |
| --- | --- |
| Báo cáo tài chính | `/vtv/dashboard/bctc` |
| Đầu tư công | `/vtv/dashboard/dautu` |
| Tổng quan & Sử dụng | `/vtv/dashboard/eoffice` |
| Tiến độ xử lý văn bản | `/vtv/dashboard/vanban` |
| Nhiệm vụ tổng quan | `/vtv/dashboard/nhiemvu` |

Ví dụ lấy BCTC quý III/2026: `GET /vtv/dashboard/bctc?period=2026-Q3`, kèm `Authorization: Bearer <token>`. Thay base URL bằng tên miền CMS khi triển khai. Không đưa token vào mã JavaScript gửi tới trình duyệt.

Không truyền `period` thì lấy phiên bản **được công bố gần nhất theo thời gian công bố**, không phải tự chọn kỳ có ngày lớn nhất. Dashboard muốn hiển thị một kỳ cụ thể nên truyền kỳ rõ ràng.

Phản hồi có `category`, `period`, `version`, `published_at`, `unit`, `summary`, `records`. Hợp đồng đầy đủ ở [API.md](API.md), ví dụ tích hợp ở [dashboard-server.ts](../examples/dashboard-server.ts). BCTC lấy theo mã chỉ tiêu; các tổng Văn phòng điện tử đã có quy tắc tránh cộng trùng hàng tổng và hàng đơn vị.

Đường dẫn mở trực tiếp cửa sổ nhập của CMS là `/admin/vtv-cms/{category}/import`, ví dụ [nhập BCTC](http://localhost:8055/admin/vtv-cms/bctc/import). Khi chuyển lên máy chủ, thay `localhost:8055` bằng tên miền CMS. Các URL `#/.../import` trên Dashboard cũ vẫn thuộc ứng dụng cũ; cần cập nhật liên kết nếu muốn chuyển người nhập sang CMS mới. Xem [import-links.ts](../examples/import-links.ts).

## 10. Đầu chờ đăng nhập SSO

Hiện giao diện SSO đã được **tạm ẩn** theo yêu cầu; dùng tài khoản Directus để đăng nhập. Đầu chờ và cấu hình SSO vẫn được giữ để bật lại sau. Khi được bật lại, phần **Đăng nhập SSO** hiển thị hướng dẫn và ví dụ, không tự kết nối chỉ bằng thao tác sao chép.

Đội phụ trách SSO cần cung cấp: địa chỉ discovery OpenID Connect, Client ID, Client Secret, claim định danh và cách ánh xạ tài khoản/vai trò. Callback dự kiến trên máy chủ: `https://<cms-host>/auth/login/vtv/callback`.

Đội kỹ thuật cập nhật cấu hình máy chủ, khai báo tài khoản được phép dùng SSO, rồi khởi động lại Directus. Để `AUTH_PROVIDERS` trống khi chưa có cấu hình thật. Chỉ bật provider `vtv` khi các thông tin đã đầy đủ; cấu hình discovery giả có thể khiến dịch vụ không khởi động.

Quy trình OIDC, SAML và kiểm tra quyền được mô tả tại [SSO.md](SSO.md). Bản cục bộ khóa địa chỉ HTTP localhost; cấu hình HTTPS/tên miền SSO thực tế dùng bản triển khai máy chủ theo README.

## 11. Sao lưu bản cục bộ

Dữ liệu báo cáo nằm trong thư mục dự án, không nằm trong bộ nhớ trình duyệt.

1. Bấm đúp **Dung CMS.command** và chờ thông báo đã dừng.
2. Tạo thư mục sao lưu có ngày giờ ở vị trí do đơn vị quản lý.
3. Sao chép cùng lúc `.runtime/data.db`, toàn bộ `.runtime/uploads/` và `.env`. Trong Finder, nhấn **Command + Shift + .** để thấy tệp/thư mục ẩn.
4. Giữ thêm mã nguồn, cấu hình và phiên bản extension tương ứng. `.env` chứa thông tin bí mật, chỉ lưu ở nơi quản trị viên được phép truy cập.
5. Bấm **Mo CMS.command** để mở lại CMS và kiểm tra truy cập.

Khôi phục cần dừng CMS trước, giữ một bản sao trạng thái hiện tại rồi khôi phục đồng bộ cơ sở dữ liệu và tệp upload của cùng bản sao lưu. Không thay riêng tệp cơ sở dữ liệu khi dịch vụ còn đang chạy.

Bộ Node/Directus cục bộ nằm ở `.runtime/node22` và `.runtime/directus`; đây là bộ chạy, không thay thế bản sao lưu dữ liệu. Các thư mục này không được đưa vào Git. Không xóa `.runtime` để “dọn cache”, vì nó chứa cả dữ liệu báo cáo.

Bản máy chủ Docker dùng PostgreSQL và volume uploads, có cách sao lưu khác; xem [README](../README.md).

## 12. Xử lý lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| Không thể kết nối / Connection refused | Mở đúng `http://localhost:8055/admin/vtv-cms`, bấm `Mo CMS.command`, đợi sẵn sàng rồi tải lại trang. |
| Nhập `https://localhost:8055` không vào được | Bản cục bộ dùng **http**. Dùng đúng liên kết trong mục 1. |
| Vào được trang đăng nhập nhưng sai tài khoản | Email hiện tại là `admin@gmail.com`, nhập mật khẩu đã đặt, tránh khoảng trắng thừa. Đây là đăng nhập CMS, không phải Google. |
| Phiên hết hạn / lỗi 401 | Đăng nhập lại. Nếu vẫn lặp, đóng trang cũ và mở lại liên kết CMS. |
| Đăng nhập được nhưng báo “Không tìm thấy trang này” | Mở đúng `/admin/vtv-cms` và tải lại trang để nhận module mới. Nếu vẫn lỗi, khởi động lại CMS và nhờ kỹ thuật kiểm tra module đã được đóng gói/nạp thành công. |
| Không có nút nhập/công bố / lỗi 403 | Kiểm tra vai trò và quyền chuyên mục. Người nhập liệu không mặc nhiên có quyền công bố. |
| Có thông báo cổng 8055 bị chiếm | Chạy `Kiem tra CMS.command` và nhờ kỹ thuật xác định tiến trình dùng cổng. Công cụ không tự dừng chương trình khác. |
| Lưu nháp được nhưng Dashboard chưa đổi | Kiểm tra đã **công bố** chưa, đúng kỳ chưa, và Dashboard đã được đội phát triển kết nối API CMS chưa. |
| API trả 404 | Chưa có bản công bố cho chuyên mục/kỳ đó hoặc đường dẫn sai; không tự hiểu là số liệu bằng 0. |
| Sai định dạng số hoặc số bị lệch đơn vị | Chọn lại quy ước số/đơn vị nguồn rồi kiểm tra. Nếu đã lưu, nhập một phiên bản đã sửa và công bố lại. |
| Tệp bị báo có công thức | Tạo bản sao, chuyển công thức sang giá trị trong Excel, lưu và nhập lại. |
| Tệp bị báo trùng | Tìm phiên bản đã có trong lịch sử. Muốn khôi phục dùng bản lưu trữ; muốn sửa thì sửa nội dung tệp. |
| Thiếu cột / không đọc được Word | Dùng mẫu CMS; Word chỉ hỗ trợ bảng BCTC trong `.docx`. |
| Có nhiều sheet nhưng thiếu dữ liệu | Kiểm tra sheet được chọn; mỗi phiên bản chỉ nhập một sheet. Công bố hai sheet riêng cùng chuyên mục/kỳ sẽ thay thế nhau, không gộp lại. |
| Không thấy phiên bản cũ | Xóa bộ lọc/từ khóa và bấm **Tải thêm** nếu có. Kiểm tra đúng quyền chuyên mục. |
| SSO chưa hiện hoặc lỗi sau khi bật | Đối chiếu cấu hình theo SSO.md; giữ provider tắt khi chưa có thông tin thật. |
| Nhập ở bản demo rồi tải lại bị mất | Dùng CMS thật trên cổng 8055. Bản demo chỉ mô phỏng giao diện. |

## 13. Thông tin vận hành cục bộ cho kỹ thuật

- Dịch vụ macOS: `vn.gov.vtv.cms.local`, chạy bằng tài khoản macOS hiện tại.
- Tệp đăng ký: `~/Library/LaunchAgents/vn.gov.vtv.cms.local.plist`.
- Chỉ lắng nghe `127.0.0.1:8055`; không mở cổng ra mạng nội bộ/Internet.
- Nhật ký: `.runtime/logs/cms.log` và `.runtime/logs/cms-error.log`. Theo dõi dung lượng nhật ký khi chạy lâu dài.
- Bộ chạy cục bộ: Node 22.23.2, Directus 11.17.4, SQLite. Không cần mở `pnpm dev` để chạy CMS thật.
- Có thể kiểm tra sức khỏe ở [http://localhost:8055/server/health](http://localhost:8055/server/health); bình thường phản hồi `status: ok`.

Chạy từ thư mục dự án, không cần cài Node toàn hệ thống:

```sh
cd /Users/luc1fxr/CMS
./.runtime/node22/bin/node directus/scripts/local-service.mjs status
./.runtime/node22/bin/node directus/scripts/local-service.mjs start
./.runtime/node22/bin/node directus/scripts/local-service.mjs restart
./.runtime/node22/bin/node directus/scripts/local-service.mjs stop
```

Chọn lệnh cần dùng; không chạy lần lượt cả bốn nếu chỉ muốn kiểm tra. `start` sẽ bật lại chế độ tự chạy khi đăng nhập nếu trước đó đã tắt bằng launchctl.

Muốn tắt cả tự khởi động, dừng CMS rồi chạy:

```sh
launchctl disable "gui/$(id -u)/vn.gov.vtv.cms.local"
```

Giữ thư mục dự án ở vị trí hiện tại để dịch vụ đăng nhập tìm được đường dẫn. Nếu cần chuyển thư mục, dừng CMS trước, di chuyển đầy đủ cả tệp ẩn, rồi bấm **Mo CMS.command** ở vị trí mới để đăng ký lại đường dẫn. Sau đó dùng thư mục mới trong các lệnh vận hành.

Để nhiều người sử dụng liên tục, triển khai bản máy chủ theo [README](../README.md), kết nối Dashboard và thử SSO với hệ thống thật. Bản cục bộ không thay thế hạ tầng vận hành chính thức của đơn vị.

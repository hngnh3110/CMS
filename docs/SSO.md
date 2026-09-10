# Đầu chờ SSO

CMS dùng đăng nhập và phiên của Directus. Module VTV sử dụng `useApi()` của Directus để lấy API client hiện tại; không lưu access token hoặc client secret trong localStorage.

## OpenID Connect (mặc định)

1. Tạo client OIDC trong hệ thống SSO của đơn vị.
2. Đăng ký redirect/callback chính xác `https://<cms-host>/auth/login/vtv/callback`.
3. Cập nhật `.env`: `PUBLIC_URL`, `AUTH_VTV_ISSUER_URL`, `AUTH_VTV_CLIENT_ID`, `AUTH_VTV_CLIENT_SECRET`, `AUTH_VTV_REDIRECT_ALLOW_LIST` và role tối thiểu `AUTH_VTV_DEFAULT_ROLE_ID`. Issuer URL dùng địa chỉ discovery mà nhà cung cấp đưa ra; kiểm tra khả năng truy cập từ container Directus.
4. Đặt `AUTH_PROVIDERS=vtv` sau khi đủ cấu hình, rồi khởi động lại Directus. Nút “SSO VTV” sẽ do trang đăng nhập Directus cung cấp. Đường dẫn bắt đầu đăng nhập là `/auth/login/vtv?redirect=https%3A%2F%2F<cms-host>%2Fadmin%2Fvtv-cms`.
5. Kiểm tra bằng một tài khoản thử: đăng nhập, vào module, quyền đúng category, đăng xuất và hết hạn phiên. Hiện chưa thực hiện bước này vì chưa có cấu hình SSO thật.

Đã đặt `AUTH_VTV_IDENTIFIER_KEY=sub`, `AUTH_VTV_ALLOW_PUBLIC_REGISTRATION=false`, session mode và redirect allowlist. Không tự cho người dùng mới vào CMS: quản trị viên tạo/ghép tài khoản Directus với provider `vtv`, external_identifier đúng claim `sub`, rồi gán vai trò phù hợp. Nếu nhà cung cấp dùng email làm identifier hoặc cần tự cấp tài khoản, phải thay cấu hình và kiểm tra chính sách theo tổ chức; không tự cấp quyền công bố/administrator từ claim không kiểm soát.

`AUTH_PROVIDERS` phải để trống khi chưa có provider thật, tránh khởi động lỗi do URL discovery giả. Client Secret được giữ trong `.env` hoặc secret manager trên máy chủ; không nhập lên bản xem trước Sites.

## SAML

Có thể thay driver bằng `AUTH_VTV_DRIVER=saml`, cung cấp `AUTH_VTV_IDP_metadata` và `AUTH_VTV_SP_metadata` cùng mapping identifier/email theo IdP. ACS là `/auth/login/vtv/acs`. Không bật đồng thời OIDC và SAML dưới cùng provider ID. Cần thử riêng với IdP thật và chứng thư của đơn vị.

## Vận hành

Dùng HTTPS, `SESSION_COOKIE_SECURE=true`, allowlist đúng hostname; đồng bộ đồng hồ máy chủ. Giữ một tài khoản quản trị khẩn cấp do đơn vị quản lý để tránh bị khóa toàn bộ khi IdP lỗi. Vai trò SSO và quyền chuyên mục CMS là hai lớp: đăng nhập thành công chưa đồng nghĩa được nhập/công bố.

Tài liệu chính thức: [Directus SSO configuration](https://directus.com/docs/configuration/auth-sso), [authentication API](https://directus.com/docs/api/authentication). Bản này khóa Directus 11.17.4; kiểm tra lại cấu hình và điều kiện giấy phép trước khi chuyển sang Directus 12.

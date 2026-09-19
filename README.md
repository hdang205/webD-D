# D&D FASHION ERP – HỆ THỐNG QUẢN TRỊ CỬA HÀNG THỜI TRANG

Hệ thống ERP chuyên biệt cho chuỗi cửa hàng thời trang **D&D Fashion**, tích hợp đầy đủ quy trình bán lẻ POS, bán buôn, nhập hàng từ xưởng may, quản lý kho mẫu mã đa kích cỡ/màu sắc, công nợ, sổ quỹ tiền mặt và báo cáo kế toán tài chính.

Ứng dụng hoạt động với cơ sở dữ liệu SQLite cục bộ bền vững, cơ chế xác thực JWT bảo mật, mã hóa mật khẩu bcrypt và phân quyền truy cập đa vai trò (RBAC) nghiêm ngặt.

---

## 🌟 ĐIỂM NỔI BẬT & CẤU TRÚC PHÂN HỆ (PHASE 8.1)

Giao diện người dùng đã được tinh giản tối ưu cho bài thuyết trình và demo thực tế:

1. **Dashboard Điều Hành Tinh Gọn**:
   - Tập trung vào **6 chỉ số trọng yếu**: Doanh thu, Số hóa đơn, Tổng sản phẩm, Tồn kho thực tế, Giá trị tồn kho (TK156), Công nợ (Phải thu/Phải trả).
   - Biểu đồ trực quan so sánh Doanh thu & Chi phí nhập xưởng 6 tháng gần nhất.
   - Hệ thống cảnh báo tự động: Hàng tồn sắp hết, Đơn hàng công nợ chờ thanh toán.
   - **100% dữ liệu thực tế** lấy từ SQLite qua API `/api/dashboard` (không hard-code).

2. **Quản Lý Danh Mục & Master Data**:
   - **Sản phẩm**: Danh mục mẫu mã thời trang, kích cỡ (S/M/L/XL), màu sắc, mã vạch, giá vốn, giá bán.
   - **Danh mục**: Quản lý nhóm hàng hóa phân cấp (Áo sơ mi, Đầm dạ hội, Quần Jeans,...), bảo vệ ràng buộc toàn vẹn dữ liệu.
   - **Khách hàng**: Danh bạ khách VIP, phân hạng (Silver/Gold/Diamond), hạn mức tín dụng.
   - **Nhà cung cấp**: Danh bạ xưởng may gia công và đối tác cung ứng vải sợi/phụ liệu.
   - **Người dùng & Nhân sự**: Quản lý hồ sơ nhân viên đồng bộ với tài khoản đăng nhập hệ thống.

3. **Giao Dịch Bán Hàng & Thu Ngân (Sales & POS)**:
   - **Trạm POS Quầy**: Thao tác bán lẻ quét mã vạch, chọn size/màu, in hóa đơn bill quầy.
   - **Hóa đơn bán hàng**: Bán buôn & bán lẻ, tự động trừ tồn kho qua Trigger, hỗ trợ thanh toán đủ (PAID), thanh toán một phần (PARTIAL), hoặc ghi nợ (UNPAID).
   - **Chặn âm kho tuyệt đối**: Tự động từ chối (HTTP 400 REJECT) nếu số lượng bán vượt quá tồn kho thực tế, cơ chế Atomic Transaction Rollback bảo toàn dữ liệu.

4. **Mua Hàng & Xưởng May (Purchasing)**:
   - Tạo phiếu nhập hàng từ xưởng may (HDM) với đơn giá vốn và số lượng từng size.
   - Tự động cộng tăng tồn kho tức thì qua SQLite Triggers.
   - Quản lý công nợ phải trả xưởng may gia công.

5. **Đề Xuất Nhập / Xuất (Requisitions)**:
   - Lập đề xuất bổ sung mẫu mã, đặt may mẫu thiết kế mới, duyệt đề xuất xuất nhập kho.

6. **Quản Lý Kho Hàng & Tồn Kho (Inventory)**:
   - Thẻ kho (01/02-VT), theo dõi lịch sử biến động nhập/xuất/kiểm kê.
   - Phiếu điều chỉnh tồn kho có kiểm soát (chặn điều chỉnh âm kho).
   - Tìm kiếm sản phẩm theo tên, mã SKU và lọc theo nhóm hàng hóa.

7. **Kế Toán & Tài Chính (Accounting)**:
   - Sổ quỹ tiền mặt và tài khoản ngân hàng (Phiếu Thu / Phiếu Chi).
   - Quản lý công nợ chi tiết theo đối tác khách hàng (TK 131) và nhà cung cấp (TK 331).
   - Báo cáo tài chính, báo cáo lãi lỗ kinh doanh.

8. **Bảo Mật Tài Khoản & Đổi Mật Khẩu (Phase 8.1)**:
   - Hỗ trợ đổi mật khẩu trực tiếp tại: **Menu Tài khoản → "Đổi Mật Khẩu"**.
   - Xác thực mật khẩu cũ bằng bcrypt, băm mật khẩu mới bằng bcrypt, tuyệt đối không lưu plaintext.
   - Ràng buộc mật khẩu mới tối thiểu 6 ký tự, không cho phép trùng mật khẩu cũ, xác nhận mật khẩu khớp.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

- **Giao diện (Frontend)**: React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide React, Vite 6.
- **Máy chủ (Backend)**: Node.js, Express, better-sqlite3.
- **Cơ sở dữ liệu (Database)**: SQLite bền vững (`data/database.sqlite`), Trigger tự động cập nhật kho, Foreign Keys toàn vẹn.
- **Xác thực & Phân quyền**: JSON Web Token (JWT), bcryptjs, Middleware kiểm soát truy cập theo vai trò (RBAC).
- **Trí tuệ nhân tạo (AI)**: Google GenAI SDK (Trợ lý AI hỗ trợ hạch toán và phân tích báo cáo).

---

## 📋 TÀI KHOẢN ĐĂNG NHẬP DEMO (RBAC)

Hệ thống tích hợp sẵn 5 tài khoản mẫu tương ứng với 5 vai trò nghiệp vụ trong cửa hàng thời trang:

| Vai trò trong hệ thống | Username | Mật khẩu mặc định | Phân hệ truy cập chính |
|---|---|:---:|---|
| **Giám Đốc / Quản Lý Cửa Hàng** (Lê Thị Duyên) | `quanly_duyen` *(alias: `director_dung`)* | `123456` | Toàn quyền: Dashboard, Quản lý, Giao dịch, Kho, Kế toán |
| **Kế Toán Trưởng / Tài Chính** (Đàm Thị Thùy Dung) | `ketoan_dung` *(alias: `cpa_trang`)* | `123456` | Dashboard, Kế toán (Sổ quỹ, Công nợ, Báo cáo), Hóa đơn, Kho |
| **Nhân Viên Bán Hàng & POS** (Đặng Trà My) | `banhang_my` *(alias: `sales_lan`)* | `123456` | Trạm POS Quầy, Bán hàng, Khách hàng, Tra cứu tồn kho |
| **Nhân Viên Mua Hàng & Xưởng** (Trần Thanh Phong) | `muahang_phong` *(alias: `muahang_dat`)* | `123456` | Nhập hàng xưởng, Nhà cung cấp, Đề xuất đặt may |
| **Thủ Kho & Quản Lý Xuất Nhập** (Chu Ngọc Hải) | `thukho_hai` *(alias: `wh_hung`)* | `123456` | Kho hàng, Phiếu nhập xuất, Tra cứu sản phẩm & mẫu mã |
| **Thủ Kho & Quản Lý Kho Vận** (Lê Thành Long) | `thukho_long` | `123456` | Tồn Kho & Xuất Nhập, Thẻ kho, Điều chỉnh kho, Sản phẩm |
| **Chuyên Viên Tư Vấn & CSKH VIP** (Nguyễn Hải Đăng) | `tuvan_dang` | `123456` | Bán lẻ POS, CSKH VIP, Tra cứu tồn kho, Đề xuất nhập |

> [!NOTE]
> - Hệ thống hỗ trợ đăng nhập bằng cả tên đăng nhập thân thiện mới (`quanly_duyen`, `ketoan_dung`, `banhang_my`, `muahang_phong`, `thukho_hai`, `thukho_long`, `tuvan_dang`) lẫn tên đăng nhập cũ để tương thích 100% với kịch bản test.
> - Mọi người dùng sau khi đăng nhập đều có thể tự đổi mật khẩu cá nhân tại nút **"Đổi Mật Khẩu"** trong menu tài khoản ở góc trên bên phải Header.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY

### 1. Yêu cầu môi trường
- Node.js version 18 trở lên (khuyến nghị Node.js 20+).
- npm đi kèm Node.js.

### 2. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 3. Khởi tạo cơ sở dữ liệu ban đầu (nếu cần)
Hệ thống đã có sẵn database SQLite hoàn chỉnh. Nếu muốn khôi phục lại dữ liệu gốc của cửa hàng:
```bash
npm run db:seed
```

### 4. Khởi động môi trường phát triển (Development)
```bash
npm run dev
```
Mở trình duyệt truy cập:
```text
http://localhost:3000
```
*(Server backend Express và frontend Vite được tích hợp chạy đồng thời trên port 3000).*

### 5. Build và chạy bản thương mại (Production)
```bash
npm run build
npm start
```

---

## 🧪 BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)

Dự án trang bị đầy đủ các bộ test tự động độc lập phục vụ kiểm định chất lượng và thẩm định rubric:

```bash
# 1. Kiểm tra chức năng Đổi mật khẩu (PUT /api/auth/password, bcrypt, validation, session)
npm run test:change-password

# 2. Kiểm tra Authentication & Đăng nhập JWT & Phân quyền RBAC
npm run test:auth

# 3. Kiểm tra toàn bộ CRUD Sản phẩm, Danh mục, Khách hàng, NCC, Nhân sự
npm run test:crud

# 4. Kiểm tra Mua hàng xưởng, tính tiền tự động và tăng tồn kho qua Trigger
npm run test:purchases

# 5. Kiểm tra Bán hàng, trừ tồn kho, thanh toán nợ và chặn bán vượt tồn (Rollback)
npm run test:sales

# 6. Kiểm tra Thẻ kho, điều chỉnh tồn kho, tìm kiếm sản phẩm và RBAC
npm run test:inventory

# 7. Kiểm tra tổng thể toàn diện 40 tiêu chí Rubric Final Audit
npm run test:audit

# 8. Kiểm tra cú pháp TypeScript toàn dự án
npm run lint
```

---

## 📡 DANH SÁCH API ENDPOINTS CHÍNH

### Xác thực & Tài khoản (`/api/auth`)
- `POST /api/auth/login`: Đăng nhập, trả về JWT Token và thông tin user an toàn.
- `GET /api/auth/me`: Xác thực và khôi phục phiên làm việc từ Token.
- `POST /api/auth/logout`: Đăng xuất khỏi hệ thống.
- `PUT /api/auth/password`: Đổi mật khẩu người dùng hiện tại (xác thực bcrypt).

### Quản trị & Master Data
- `GET /api/dashboard`: Thống kê doanh thu, tồn kho, công nợ thời gian thực.
- `GET, POST, PUT, DELETE /api/products`: CRUD mẫu mã thời trang, size, màu, giá vốn, giá bán.
- `GET, POST, PUT, DELETE /api/categories`: CRUD nhóm hàng và danh mục.
- `GET, POST, PUT, DELETE /api/customers`: CRUD danh bạ khách hàng VIP.
- `GET, POST, PUT, DELETE /api/suppliers`: CRUD xưởng may và nhà cung cấp.
- `GET, POST, PUT, DELETE /api/employees`: CRUD nhân sự & tự động tạo tài khoản người dùng liên kết.

### Nghiệp vụ Giao dịch & Kho
- `GET, POST /api/purchases`: Xem và lập hóa đơn mua hàng xưởng (tự động tăng tồn kho).
- `GET, POST /api/sales`: Xem và lập hóa đơn bán hàng POS/Sỉ (tự động trừ tồn kho, chặn âm kho).
- `GET, POST /api/inventory/adjust`: Kiểm kê và điều chỉnh số lượng tồn kho có ghi log.

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN

```text
webD-D/
├── data/                       # File SQLite database (database.sqlite)
├── public/                     # Ảnh sản phẩm mẫu thời trang SP01-SP20, TX001-TX020
├── src/
│   ├── components/
│   │   ├── Auth/               # LoginPage, ChangePasswordModal
│   │   ├── CashBook/           # Sổ quỹ thu chi tiền mặt/ngân hàng
│   │   ├── Categories/         # Quản lý danh mục nhóm hàng
│   │   ├── Customers/          # Quản lý khách hàng VIP
│   │   ├── Dashboard.tsx       # Bảng điều hành tổng quan 6 chỉ số
│   │   ├── Debts/              # Quản lý công nợ phải thu / phải trả
│   │   ├── Employees/          # Quản lý hồ sơ nhân sự & tài khoản
│   │   ├── Header.tsx          # Thanh điều hướng trên cùng tinh giản
│   │   ├── Inventory/          # Quản lý kho hàng & thẻ kho
│   │   ├── Navigation/         # MobileDrawer & MobileBottomNav
│   │   ├── POS/                # Trạm thu ngân bán lẻ tại quầy
│   │   ├── Products/           # Quản lý mẫu mã & sản phẩm thời trang
│   │   ├── Purchases/          # Quản lý nhập hàng xưởng
│   │   ├── Reports/            # Báo cáo tài chính & doanh thu
│   │   ├── Requisitions/       # Đề xuất duyệt nhập/xuất
│   │   ├── Sales/              # Quản lý hóa đơn bán hàng
│   │   ├── Sidebar.tsx         # Menu điều hướng 5 phân nhóm chuẩn
│   │   └── Suppliers/          # Quản lý xưởng may & nhà cung cấp
│   ├── db/
│   │   ├── database.ts         # Kết nối better-sqlite3 singleton
│   │   ├── schema.sql          # Khởi tạo bảng, index và trigger
│   │   └── seed.ts             # Nạp dữ liệu mẫu ban đầu
│   ├── server/
│   │   ├── controllers/        # Express controllers (auth, products, sales,...)
│   │   ├── middleware/         # Middleware authenticateToken, requireRole (RBAC)
│   │   ├── routes/             # Định tuyến API
│   │   └── test*.ts            # Bộ test tự động các phân hệ
│   ├── services/               # API clients frontend
│   ├── types/                  # TypeScript interface định nghĩa mô hình dữ liệu
│   └── App.tsx                 # Root application component
├── server.ts                   # Entry point Express backend server
├── vite.config.ts              # Cấu hình Vite
└── package.json                # Dependencies & Scripts
```

---

## 🛡️ CAM KẾT CHẤT LƯỢNG

- **Linting**: 100% sạch lỗi TypeScript (`npm run lint`).
- **Production Build**: Build thành công mượt mà (`npm run build`).
- **Persistence**: Toàn bộ dữ liệu lưu trữ bền vững trong SQLite, an toàn tuyệt đối khi reload hoặc khởi động lại server.

---

## 🚀 HƯỚNG DẪN DEPLOY CLOUD (RENDER.COM)

1. Đăng nhập [Render.com](https://render.com) bằng tài khoản GitHub.
2. Chọn **New +** -> **Web Service** -> Chọn repository `webD-D`.
3. Cấu hình triển khai:
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Region:** `Singapore`
   - **Instance Type:** `Free`
4. Bấm **Create Web Service** để hoàn tất triển khai.

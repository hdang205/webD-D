# D&D Fashion ERP

Ứng dụng web offine quản lý cửa hàng thời trang D&D, hỗ trợ bán lẻ và bán sỉ, quản lý sản phẩm theo mẫu mã/size/màu, tồn kho, hóa đơn, công nợ, sổ quỹ và báo cáo kế toán.

## Tổng quan

Dự án được xây dựng bằng React và TypeScript, chạy trên Vite thông qua Express. Dữ liệu demo và các thao tác trên ứng dụng được lưu trong `localStorage` của trình duyệt.

Các nhóm chức năng chính:

- Dashboard tổng quan doanh thu, tồn kho và tình hình kinh doanh
- POS bán hàng tại quầy
- Quản lý khách hàng, nhà cung cấp và nhân viên
- Quản lý sản phẩm, nhập xuất kho và kiểm kê
- Hóa đơn bán hàng, mua hàng và theo dõi công nợ
- Sổ quỹ thu chi và nhật ký chung
- Hệ thống tài khoản và báo cáo tài chính
- Phiếu đề xuất mua hàng/xuất kho
- CRM chăm sóc khách hàng
- Phân quyền theo vai trò người dùng
- Trợ lý AI kế toán sử dụng Google Gemini
- Giao diện responsive cho desktop và mobile

## Công nghệ sử dụng

- React 19
- TypeScript
- Vite 6
- Express
- Tailwind CSS 4
- Recharts
- Lucide React
- Motion
- Google GenAI SDK

## Yêu cầu môi trường

- Node.js 18 trở lên, khuyến nghị Node.js 20+
- npm
- Không bắt buộc Bun; dự án có thể chạy bằng npm

## Cài đặt và chạy local

### 1. Clone project

```bash
git clone <URL_REPOSITORY>
cd webD-D-main
```

### 2. Cài dependency

```bash
npm install
```

### 3. Cấu hình biến môi trường tùy chọn

Tạo file `.env` ở thư mục gốc nếu muốn sử dụng Trợ lý AI:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Có thể tham khảo file `.env.example`. Ứng dụng vẫn chạy các chức năng quản lý thông thường nếu chưa cấu hình `GEMINI_API_KEY`; chỉ các chức năng gọi Gemini mới yêu cầu biến này.

### 4. Khởi động web

```bash
npm run dev
```

Mở trình duyệt tại:

```text
http://localhost:3000
```

Server backend Express và Vite được khởi động cùng nhau qua file `server.ts`.

## Tài khoản demo

Ứng dụng có sẵn các vai trò demo để thử nghiệm phân quyền:

| Vai trò | Username | Màn hình mặc định |
| --- | --- | --- |
| Quản lý cửa hàng/Giám đốc | `director.dung` | Dashboard |
| Kế toán trưởng | `accountant.trang` | Sổ quỹ |
| Nhân viên bán hàng | `sales.lan` | POS |
| Nhân viên mua hàng | `muahang.dat` | Phiếu đề xuất |
| Thủ kho | `warehouse.nam` | Tồn kho |

Đây là tài khoản mô phỏng cho mục đích demo, không nên dùng làm cơ chế xác thực khi triển khai production.

## Các lệnh npm

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy môi trường phát triển tại port `3000` |
| `npm run build` | Build frontend và bundle server production |
| `npm start` | Chạy server từ thư mục `dist` sau khi build |
| `npm run preview` | Preview bản build Vite |
| `npm run lint` | Kiểm tra TypeScript bằng `tsc --noEmit` |

## API cơ bản

- `GET /api/health`: kiểm tra trạng thái server
- `POST /api/ai-assistant`: gửi yêu cầu tới trợ lý Google Gemini

Ví dụ kiểm tra server trên Windows PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/health
```

## Cấu trúc thư mục

```text
.
├── assets/                 # Tài nguyên tĩnh
├── src/
│   ├── components/         # Các màn hình và component React
│   ├── data/               # Dữ liệu khởi tạo và hệ thống tài khoản
│   ├── services/           # Dịch vụ lưu trữ localStorage
│   ├── types/              # Kiểu dữ liệu nghiệp vụ
│   └── utils/              # RBAC, format và nghiệp vụ kế toán
├── server.ts               # Express server và API Gemini
├── index.html              # HTML entry point
├── package.json            # Scripts và dependency
└── vite.config.ts          # Cấu hình Vite
```

## Lưu ý dữ liệu

Dữ liệu nghiệp vụ hiện được lưu ở `localStorage`, nên chỉ tồn tại trong trình duyệt và profile trình duyệt đang sử dụng. Xóa dữ liệu site hoặc đổi trình duyệt có thể làm mất dữ liệu demo đã tạo. Trước khi triển khai thực tế cần bổ sung backend, cơ sở dữ liệu, xác thực người dùng và cơ chế sao lưu.

## Kiểm tra trước khi đóng góp

```bash
npm run lint
npm run build
```

-- ============================================================================
-- PHẦN MỀM KẾ TOÁN THỜI TRANG D&D - RELATIONAL DATABASE SCHEMA (SQLite 3)
-- Tuân thủ Thông tư 133/2016/TT-BTC & 200/2014/TT-BTC
-- Chuẩn hóa toàn bộ quan hệ 1-N, ràng buộc PK, FK, UNIQUE, NOT NULL, CHECK
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA recursive_triggers = ON;

-- 1. BẢNG THÔNG TIN DOANH NGHIỆP (Single-row table)
CREATE TABLE IF NOT EXISTS company_info (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    tax_code TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    bank_account TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    director_name TEXT NOT NULL,
    chief_accountant TEXT NOT NULL,
    treasurer_name TEXT NOT NULL,
    accounting_standard TEXT NOT NULL CHECK (accounting_standard IN ('TT133', 'TT200')),
    fiscal_year INTEGER NOT NULL CHECK (fiscal_year >= 2000),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. BẢNG HỆ THỐNG TÀI KHOẢN KẾ TOÁN (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_code TEXT REFERENCES accounts(code) ON DELETE RESTRICT ON UPDATE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'OFF_BALANCE')),
    level INTEGER NOT NULL CHECK (level >= 1),
    is_detail INTEGER NOT NULL CHECK (is_detail IN (0, 1)),
    opening_debit REAL NOT NULL DEFAULT 0 CHECK (opening_debit >= 0),
    opening_credit REAL NOT NULL DEFAULT 0 CHECK (opening_credit >= 0),
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);

-- 3. BẢNG DANH MỤC NHÓM SẢN PHẨM / THỜI TRANG (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. BẢNG SẢN PHẨM / HÀNG HÓA THỜI TRANG (Products / Inventory Items)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    size TEXT,
    color TEXT,
    barcode TEXT UNIQUE,
    image_url TEXT,
    cost_price REAL NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    selling_price REAL NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    opening_quantity INTEGER NOT NULL DEFAULT 0 CHECK (opening_quantity >= 0),
    opening_value REAL NOT NULL DEFAULT 0 CHECK (opening_value >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0), -- Chống âm tồn kho
    min_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

-- 5. BẢNG ĐỐI TÁC: KHÁCH HÀNG & NHÀ CUNG CẤP (Partners)
CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CUSTOMER', 'SUPPLIER', 'BOTH')),
    tax_code TEXT,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT,
    tier TEXT CHECK (tier IN ('DIAMOND', 'GOLD', 'SILVER', 'STANDARD', 'WHOLESALE')),
    credit_limit REAL DEFAULT 0 CHECK (credit_limit >= 0),
    bank_account TEXT,
    bank_name TEXT,
    opening_debt_debit REAL NOT NULL DEFAULT 0 CHECK (opening_debt_debit >= 0),
    opening_debt_credit REAL NOT NULL DEFAULT 0 CHECK (opening_debt_credit >= 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_phone ON partners(phone);
CREATE INDEX IF NOT EXISTS idx_partners_code ON partners(code);

-- 6. BẢNG NGƯỜI DÙNG & TÀI KHOẢN ĐĂNG NHẬP (Users)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'DIRECTOR', 
        'CHIEF_ACCOUNTANT', 
        'WAREHOUSE_MANAGER', 
        'SALES_CASHIER', 
        'PURCHASING_STAFF', 
        'SALES_STAFF', 
        'STAFF'
    )),
    role_title TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    avatar TEXT,
    branch TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 7. BẢNG NHÂN SỰ & HỒ SƠ NHÂN VIÊN (Employees)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    birthday TEXT,
    id_card_number TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT,
    department TEXT NOT NULL CHECK (department IN (
        'SALES_POS', 
        'PURCHASING', 
        'ACCOUNTING', 
        'WAREHOUSE', 
        'MANAGEMENT', 
        'MARKETING_DESIGN'
    )),
    position TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'DIRECTOR', 
        'CHIEF_ACCOUNTANT', 
        'WAREHOUSE_MANAGER', 
        'SALES_CASHIER', 
        'PURCHASING_STAFF', 
        'SALES_STAFF', 
        'STAFF'
    )),
    branch TEXT NOT NULL,
    avatar TEXT,
    start_date TEXT NOT NULL,
    base_salary REAL NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
    allowance REAL NOT NULL DEFAULT 0 CHECK (allowance >= 0),
    commission_rate REAL NOT NULL DEFAULT 0 CHECK (commission_rate >= 0),
    insurance_salary REAL DEFAULT 0 CHECK (insurance_salary >= 0),
    bank_account TEXT,
    bank_name TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'RESIGNED')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);

-- 8. BẢNG HÓA ĐƠN BÁN HÀNG & MUA HÀNG (Invoices)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    invoice_symbol TEXT,
    date TEXT NOT NULL,
    due_date TEXT,
    type TEXT NOT NULL CHECK (type IN ('SALES', 'PURCHASE')),
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    subtotal REAL NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_total REAL NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    vat_total REAL NOT NULL DEFAULT 0 CHECK (vat_total >= 0),
    grand_total REAL NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
    paid_amount REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED')),
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_partner ON invoices(partner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);

-- 9. BẢNG CHI TIẾT HÓA ĐƠN (Invoice Items - Chuẩn hóa mảng JSON)
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    item_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    discount_rate REAL NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),
    discount_amount REAL NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    vat_rate REAL NOT NULL DEFAULT 0 CHECK (vat_rate >= 0),
    vat_amount REAL NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    total_amount REAL NOT NULL CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);

-- 10. BẢNG GIAO DỊCH THU / CHI / SỔ QUỸ (Cash Transactions)
-- Có liên kết thanh toán invoice_id để xử lý paid_amount và quản lý công nợ
CREATE TABLE IF NOT EXISTS cash_transactions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_DEPOSIT', 'BANK_WITHDRAWAL')),
    person_name TEXT NOT NULL,
    person_address TEXT,
    reason TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    opposite_account_code TEXT NOT NULL REFERENCES accounts(code) ON DELETE RESTRICT ON UPDATE CASCADE,
    fund_account_code TEXT NOT NULL REFERENCES accounts(code) ON DELETE RESTRICT ON UPDATE CASCADE,
    partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL ON UPDATE CASCADE,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE, -- Liên kết hóa đơn
    invoice_ref TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_by_name TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cash_partner ON cash_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_cash_invoice ON cash_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cash_date ON cash_transactions(date);
CREATE INDEX IF NOT EXISTS idx_cash_fund_acc ON cash_transactions(fund_account_code);

-- 11. BẢNG PHIẾU XUẤT NHẬP KHO (Inventory Logs)
CREATE TABLE IF NOT EXISTS inventory_logs (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('IMPORT', 'EXPORT')),
    invoice_ref TEXT,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE,
    partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL ON UPDATE CASCADE,
    partner_name TEXT,
    deliverer_or_receiver TEXT,
    warehouse_name TEXT NOT NULL DEFAULT 'Kho Tổng Thời Trang D&D',
    stock_account_code TEXT REFERENCES accounts(code) ON DELETE RESTRICT ON UPDATE CASCADE,
    opposite_account_code TEXT REFERENCES accounts(code) ON DELETE RESTRICT ON UPDATE CASCADE,
    total_value REAL NOT NULL DEFAULT 0 CHECK (total_value >= 0),
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inv_logs_type ON inventory_logs(type);
CREATE INDEX IF NOT EXISTS idx_inv_logs_date ON inventory_logs(date);
CREATE INDEX IF NOT EXISTS idx_inv_logs_invoice ON inventory_logs(invoice_id);

-- 12. BẢNG CHI TIẾT PHIẾU XUẤT NHẬP KHO (Inventory Log Items - Chuẩn hóa mảng JSON)
-- movement_type lưu trực tiếp trên dòng item để độc lập khi xóa cascade
CREATE TABLE IF NOT EXISTS inventory_log_items (
    id TEXT PRIMARY KEY,
    inventory_log_id TEXT NOT NULL REFERENCES inventory_logs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('IMPORT', 'EXPORT')),
    item_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inv_items_log ON inventory_log_items(inventory_log_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_product ON inventory_log_items(product_id);

-- 13. BẢNG PHIẾU YÊU CẦU / ĐỀ XUẤT NHẬP XUẤT HÀNG (Stock Requisitions)
CREATE TABLE IF NOT EXISTS stock_requisitions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('IMPORT_REQUEST', 'EXPORT_REQUEST')),
    urgency TEXT NOT NULL CHECK (urgency IN ('NORMAL', 'HIGH', 'URGENT')),
    reason TEXT NOT NULL,
    requester_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    requester_name TEXT NOT NULL,
    requester_role TEXT NOT NULL,
    department TEXT NOT NULL,
    suggested_supplier_id TEXT REFERENCES partners(id) ON DELETE SET NULL ON UPDATE CASCADE,
    suggested_supplier_name TEXT,
    total_estimated_amount REAL NOT NULL DEFAULT 0 CHECK (total_estimated_amount >= 0),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
    approver_id TEXT REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE,
    approver_name TEXT,
    approval_date TEXT,
    approval_notes TEXT,
    created_document_ref TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reqs_status ON stock_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_reqs_requester ON stock_requisitions(requester_id);

-- 14. BẢNG CHI TIẾT ĐỀ XUẤT NHẬP XUẤT (Requisition Items - Chuẩn hóa mảng JSON)
CREATE TABLE IF NOT EXISTS requisition_items (
    id TEXT PRIMARY KEY,
    requisition_id TEXT NOT NULL REFERENCES stock_requisitions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    item_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    size TEXT,
    color TEXT,
    unit TEXT NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),
    approved_qty INTEGER DEFAULT 0 CHECK (approved_qty >= 0),
    estimated_unit_price REAL NOT NULL DEFAULT 0 CHECK (estimated_unit_price >= 0),
    total_estimated REAL NOT NULL DEFAULT 0 CHECK (total_estimated >= 0),
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_req_items_requisition ON requisition_items(requisition_id);
CREATE INDEX IF NOT EXISTS idx_req_items_product ON requisition_items(product_id);

-- 15. BẢNG SỔ NHẬT KÝ CHUNG / BÚT TOÁN KẾ TOÁN (Journal Entries)
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    document_ref TEXT,
    document_type TEXT CHECK (document_type IN ('CASH', 'INVOICE', 'INVENTORY', 'MANUAL')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_code ON journal_entries(code);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date);

-- 16. BẢNG ĐỊNH KHOẢN CHI TIẾT NỢ / CÓ (Journal Details - Chuẩn hóa mảng JSON)
CREATE TABLE IF NOT EXISTS journal_details (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE ON UPDATE CASCADE,
    account_code TEXT NOT NULL REFERENCES accounts(code) ON DELETE RESTRICT ON UPDATE CASCADE,
    account_name TEXT NOT NULL,
    debit_amount REAL NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount REAL NOT NULL DEFAULT 0 CHECK (credit_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_journal_details_entry ON journal_details(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_details_account ON journal_details(account_code);

-- 17. BẢNG CHĂM SÓC KHÁCH HÀNG & TƯ VẤN HÌNH THỂ (Customer Care Logs - CRM)
CREATE TABLE IF NOT EXISTS customer_care_logs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE ON UPDATE CASCADE,
    staff_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('SHOWROOM', 'PHONE', 'ZALO', 'FACEBOOK', 'OTHER')),
    purpose TEXT NOT NULL,
    height_cm REAL CHECK (height_cm IS NULL OR height_cm >= 0),
    weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0),
    bust_cm REAL CHECK (bust_cm IS NULL OR bust_cm >= 0),
    waist_cm REAL CHECK (waist_cm IS NULL OR waist_cm >= 0),
    hips_cm REAL CHECK (hips_cm IS NULL OR hips_cm >= 0),
    body_shape TEXT CHECK (body_shape IS NULL OR body_shape IN ('HOURGLASS', 'PEAR', 'RECTANGLE', 'INVERTED_TRIANGLE', 'APPLE')),
    recommended_size TEXT,
    style_preferences TEXT,
    style_notes TEXT,
    customer_feedback TEXT,
    action_taken TEXT NOT NULL,
    next_appointment_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('CONSULTING', 'ORDER_PLACED', 'FOLLOW_UP', 'APPOINTMENT_SCHEDULED', 'RESOLVED')),
    priority TEXT NOT NULL CHECK (priority IN ('HOT', 'WARM', 'COLD')),
    satisfaction_rating INTEGER CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_care_partner ON customer_care_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_staff ON customer_care_logs(staff_id);

-- 18. BẢNG NHẮC HẸN CHĂM SÓC KHÁCH HÀNG (Care Reminders - CRM)
CREATE TABLE IF NOT EXISTS care_reminders (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('BIRTHDAY', 'INACTIVE_VIP', 'POST_PURCHASE_FOLLOWUP', 'GARMENT_ALTERATION')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE ON UPDATE CASCADE,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DONE')),
    voucher_code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reminders_partner ON care_reminders(partner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON care_reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON care_reminders(due_date);


-- ============================================================================
-- TRIGGERS: TỰ ĐỘNG CẬP NHẬT TỒN KHO & ĐỒNG BỘ CÔNG NỢ THANH TOÁN
-- ============================================================================

-- Trigger 1: Kiểm soát xuất nhập kho khi thêm inventory_log_items
-- Nếu là XUẤT (EXPORT): Kiểm tra tồn kho trước, nếu không đủ -> ABORT báo lỗi ngay lập tức!
-- Nếu đủ tồn kho: Trừ current_stock
-- Nếu là NHẬP (IMPORT): Cộng current_stock
CREATE TRIGGER IF NOT EXISTS trg_inventory_log_item_after_insert
AFTER INSERT ON inventory_log_items
FOR EACH ROW
BEGIN
    -- Kiểm tra nếu là phiếu xuất và tồn kho hiện tại không đủ
    SELECT CASE
        WHEN NEW.movement_type = 'EXPORT'
         AND (SELECT current_stock FROM products WHERE id = NEW.product_id) < NEW.quantity
        THEN RAISE(ABORT, 'LỖI TỒN KHO: Số lượng tồn kho không đủ để xuất hàng!')
    END;

    -- Nếu là phiếu NHẬP (IMPORT) -> Tăng tồn kho
    UPDATE products
    SET current_stock = current_stock + NEW.quantity,
        updated_at = datetime('now')
    WHERE id = NEW.product_id
      AND NEW.movement_type = 'IMPORT';

    -- Nếu là phiếu XUẤT (EXPORT) -> Giảm tồn kho
    UPDATE products
    SET current_stock = current_stock - NEW.quantity,
        updated_at = datetime('now')
    WHERE id = NEW.product_id
      AND NEW.movement_type = 'EXPORT';
END;

-- Trigger 2: Khi xóa dòng inventory_log_items, hoàn trả lại tồn kho
CREATE TRIGGER IF NOT EXISTS trg_inventory_log_item_after_delete
AFTER DELETE ON inventory_log_items
FOR EACH ROW
BEGIN
    -- Nếu phiếu NHẬP bị xóa: kiểm tra xem nếu trừ đi có bị âm không
    SELECT CASE
        WHEN OLD.movement_type = 'IMPORT'
         AND (SELECT current_stock FROM products WHERE id = OLD.product_id) < OLD.quantity
        THEN RAISE(ABORT, 'LỖI TỒN KHO: Không thể xóa phiếu nhập vì hàng hóa đã được xuất hoặc bán hết!')
    END;

    -- Hoàn tác phiếu NHẬP -> Giảm tồn kho
    UPDATE products
    SET current_stock = current_stock - OLD.quantity,
        updated_at = datetime('now')
    WHERE id = OLD.product_id
      AND OLD.movement_type = 'IMPORT';

    -- Hoàn tác phiếu XUẤT -> Tăng tồn kho
    UPDATE products
    SET current_stock = current_stock + OLD.quantity,
        updated_at = datetime('now')
    WHERE id = OLD.product_id
      AND OLD.movement_type = 'EXPORT';
END;

-- Trigger 3: Tự động cập nhật paid_amount và status của hóa đơn khi có phiếu thu/chi liên kết
CREATE TRIGGER IF NOT EXISTS trg_cash_transaction_after_insert
AFTER INSERT ON cash_transactions
FOR EACH ROW
WHEN NEW.invoice_id IS NOT NULL
BEGIN
    UPDATE invoices
    SET paid_amount = paid_amount + NEW.amount,
        status = CASE 
            WHEN (paid_amount + NEW.amount) >= grand_total THEN 'PAID'
            ELSE 'PARTIAL'
        END,
        updated_at = datetime('now')
    WHERE id = NEW.invoice_id;
END;

-- Trigger 4: Tự động hoàn tác paid_amount và status khi xóa phiếu thu/chi liên kết
CREATE TRIGGER IF NOT EXISTS trg_cash_transaction_after_delete
AFTER DELETE ON cash_transactions
FOR EACH ROW
WHEN OLD.invoice_id IS NOT NULL
BEGIN
    UPDATE invoices
    SET paid_amount = MAX(0, paid_amount - OLD.amount),
        status = CASE 
            WHEN (paid_amount - OLD.amount) <= 0 THEN 'UNPAID'
            WHEN (paid_amount - OLD.amount) < grand_total THEN 'PARTIAL'
            ELSE 'PAID'
        END,
        updated_at = datetime('now')
    WHERE id = OLD.invoice_id;
END;

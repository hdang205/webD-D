import bcrypt from 'bcryptjs';
import { getDatabase } from './database.js';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message: string;
}

export function runVerification(): { passed: boolean; results: TestResult[] } {
  const db = getDatabase();
  const results: TestResult[] = [];

  function record(suite: string, name: string, passed: boolean, message: string) {
    results.push({ suite, name, passed, message });
    const icon = passed ? '  ✅' : '  ❌';
    console.log(`${icon} [${suite}] ${name}: ${message}`);
  }

  console.log('\n================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA TOÀN DIỆN DATABASE SQLITE (PHASE 1)');
  console.log('================================================================\n');

  // ========================================================================
  // 1. KIỂM TRA SCHEMA & CÁC BẢNG ĐÃ TẠO
  // ========================================================================
  console.log('--- 1. KIỂM TRA SCHEMA & SỐ LƯỢNG BẢNG ---');
  const expectedTables = [
    'company_info',
    'accounts',
    'categories',
    'products',
    'partners',
    'users',
    'employees',
    'invoices',
    'invoice_items',
    'cash_transactions',
    'inventory_logs',
    'inventory_log_items',
    'stock_requisitions',
    'requisition_items',
    'journal_entries',
    'journal_details',
    'customer_care_logs',
    'care_reminders'
  ];

  const actualTables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name
  `).all().map((r: any) => r.name);

  for (const table of expectedTables) {
    const exists = actualTables.includes(table);
    if (exists) {
      const count = (db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as any).cnt;
      record('SCHEMA', `Bảng ${table}`, true, `Tồn tại, hiện có ${count} bản ghi`);
    } else {
      record('SCHEMA', `Bảng ${table}`, false, `Thiếu bảng trong database!`);
    }
  }

  // ========================================================================
  // 2. KIỂM TRA FOREIGN KEYS (RÀNG BUỘC KHÓA NGOẠI)
  // ========================================================================
  console.log('\n--- 2. KIỂM TRA FOREIGN KEY ENFORCEMENT ---');
  const fkStatus = db.pragma('foreign_keys', { simple: true });
  record('FOREIGN KEY', 'PRAGMA foreign_keys', fkStatus === 1, `Foreign keys status = ${fkStatus}`);

  // Test FK 1: Thêm invoice_item trỏ tới invoice_id không tồn tại
  try {
    db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, item_code, item_name, unit, quantity, unit_price, total_amount
      ) VALUES ('fk_test_1', 'non_existent_inv', 'inv1', 'SP001', 'Test', 'Cái', 1, 1000, 1000)
    `).run();
    record('FOREIGN KEY', 'Chặn invoice_item với invoice_id giả', false, 'Không báo lỗi FK vi phạm!');
  } catch (err: any) {
    const isFkError = err.message.includes('FOREIGN KEY constraint failed');
    record('FOREIGN KEY', 'Chặn invoice_item với invoice_id giả', isFkError, `Bắt lỗi chính xác: ${err.message}`);
  }

  // Test FK 2: Thêm product với category_id không tồn tại
  try {
    db.prepare(`
      INSERT INTO products (
        id, code, name, unit, category_id, cost_price, selling_price, current_stock
      ) VALUES ('fk_prod_test', 'TEST_FK_CODE', 'Test Prod', 'Cái', 'cat_fake_999', 100, 200, 10)
    `).run();
    record('FOREIGN KEY', 'Chặn product với category_id giả', false, 'Không báo lỗi FK vi phạm!');
  } catch (err: any) {
    const isFkError = err.message.includes('FOREIGN KEY constraint failed');
    record('FOREIGN KEY', 'Chặn product với category_id giả', isFkError, `Bắt lỗi chính xác: ${err.message}`);
  }

  // Test FK 3: Chặn xóa category khi đang có sản phẩm liên kết (RESTRICT)
  try {
    db.prepare(`DELETE FROM categories WHERE id = 'cat_somi'`).run();
    record('FOREIGN KEY', 'Chặn DELETE RESTRICT category đang có sản phẩm', false, 'Bị xóa mà không chặn RESTRICT!');
  } catch (err: any) {
    const isFkError = err.message.includes('FOREIGN KEY constraint failed');
    record('FOREIGN KEY', 'Chặn DELETE RESTRICT category đang có sản phẩm', isFkError, `Bắt lỗi chính xác: ${err.message}`);
  }

  // ========================================================================
  // 3. KIỂM TRA UNIQUE CONSTRAINTS
  // ========================================================================
  console.log('\n--- 3. KIỂM TRA UNIQUE CONSTRAINTS ---');

  // Test Unique 1: Trùng username trong bảng users
  try {
    db.prepare(`
      INSERT INTO users (
        id, username, password_hash, name, role, role_title, email, phone, branch
      ) VALUES ('dup_user', 'quanly_duyen', 'hash', 'Trùng', 'DIRECTOR', 'GD', 'a@a.com', '123', 'HN')
    `).run();
    record('UNIQUE', 'Chặn trùng username', false, 'Không báo lỗi UNIQUE vi phạm!');
  } catch (err: any) {
    const isUniqueError = err.message.includes('UNIQUE constraint failed');
    record('UNIQUE', 'Chặn trùng username', isUniqueError, `Bắt lỗi chính xác: ${err.message}`);
  }

  // Test Unique 2: Trùng mã sản phẩm (products.code)
  try {
    db.prepare(`
      INSERT INTO products (
        id, code, name, unit, category_id, cost_price, selling_price, current_stock
      ) VALUES ('dup_prod', 'SP001', 'Trùng mã', 'Cái', 'cat_somi', 100, 200, 5)
    `).run();
    record('UNIQUE', 'Chặn trùng mã sản phẩm (products.code)', false, 'Không báo lỗi UNIQUE vi phạm!');
  } catch (err: any) {
    const isUniqueError = err.message.includes('UNIQUE constraint failed');
    record('UNIQUE', 'Chặn trùng mã sản phẩm (products.code)', isUniqueError, `Bắt lỗi chính xác: ${err.message}`);
  }

  // ========================================================================
  // 4. KIỂM TRA CHECK CONSTRAINTS
  // ========================================================================
  console.log('\n--- 4. KIỂM TRA CHECK CONSTRAINTS ---');

  // Test Check 1: Chặn giá bán âm (selling_price < 0)
  try {
    db.prepare(`
      INSERT INTO products (
        id, code, name, unit, category_id, cost_price, selling_price, current_stock
      ) VALUES ('chk_neg_price', 'SP_NEG_PRICE', 'Giá âm', 'Cái', 'cat_somi', 100, -50000, 5)
    `).run();
    record('CHECK CONSTRAINT', 'Chặn giá bán âm (selling_price < 0)', false, 'Không chặn giá âm!');
  } catch (err: any) {
    const isCheckError = err.message.includes('CHECK constraint failed');
    record('CHECK CONSTRAINT', 'Chặn giá bán âm (selling_price < 0)', isCheckError, `Bắt lỗi chính xác: ${err.message}`);
  }

  // Test Check 2: Chặn tồn kho âm trực tiếp trên products (current_stock < 0)
  try {
    db.prepare(`
      UPDATE products SET current_stock = -5 WHERE id = 'inv1'
    `).run();
    record('CHECK CONSTRAINT', 'Chặn tồn kho âm (current_stock >= 0)', false, 'Cho phép cập nhật tồn kho âm!');
  } catch (err: any) {
    const isCheckError = err.message.includes('CHECK constraint failed');
    record('CHECK CONSTRAINT', 'Chặn tồn kho âm (current_stock >= 0)', isCheckError, `Bắt lỗi chính xác: ${err.message}`);
  }

  // ========================================================================
  // 5. KIỂM TRA QUẢN LÝ TỒN KHO & TRIGGER XUẤT/NHẬP
  // ========================================================================
  console.log('\n--- 5. KIỂM TRA QUẢN LÝ TỒN KHO & TRIGGER CHỐNG TỒN ÂM ---');

  // Lấy tồn kho hiện tại của SP002 (inv2)
  const prod2Before = db.prepare(`SELECT current_stock FROM products WHERE id = 'inv2'`).get() as any;
  const initialStock = prod2Before.current_stock;

  // Tạo phiếu xuất kho thử nghiệm
  db.prepare(`
    INSERT INTO inventory_logs (id, code, date, type, total_value)
    VALUES ('test_px_over', 'PX_TEST_OVER', '2026-08-25', 'EXPORT', 999999)
  `).run();

  // Test trigger: Xuất vượt quá tồn kho (initialStock + 100) -> TRIGGER PHẢI ABORT!
  try {
    db.prepare(`
      INSERT INTO inventory_log_items (id, inventory_log_id, product_id, movement_type, item_code, item_name, unit, quantity, unit_price, total_amount)
      VALUES ('test_px_item_over', 'test_px_over', 'inv2', 'EXPORT', 'SP002', 'Quần Jeans', 'Cái', ?, 280000, 2800000)
    `).run(initialStock + 100);
    record('TRIGGER TỒN KHO', 'Chặn xuất hàng vượt quá tồn kho hiện tại', false, 'Cho phép xuất vượt tồn kho!');
  } catch (err: any) {
    const isStockError = err.message.includes('LỖI TỒN KHO') || err.message.includes('CHECK constraint failed');
    record('TRIGGER TỒN KHO', 'Chặn xuất hàng vượt quá tồn kho hiện tại', isStockError, `Kích hoạt trigger chặn thành công: ${err.message}`);
  }

  // Dọn dẹp phiếu xuất thử nghiệm
  db.prepare(`DELETE FROM inventory_logs WHERE id = 'test_px_over'`).run();

  // Test trigger: Xuất kho hợp lệ (5 chiếc) -> Tồn kho phải giảm 5
  db.prepare(`
    INSERT INTO inventory_logs (id, code, date, type, total_value)
    VALUES ('test_px_valid', 'PX_TEST_VALID', '2026-08-25', 'EXPORT', 1400000)
  `).run();

  db.prepare(`
    INSERT INTO inventory_log_items (id, inventory_log_id, product_id, movement_type, item_code, item_name, unit, quantity, unit_price, total_amount)
    VALUES ('test_px_item_valid', 'test_px_valid', 'inv2', 'EXPORT', 'SP002', 'Quần Jeans', 'Cái', 5, 280000, 1400000)
  `).run();

  const prod2AfterExport = db.prepare(`SELECT current_stock FROM products WHERE id = 'inv2'`).get() as any;
  const exportOk = prod2AfterExport.current_stock === initialStock - 5;
  record('TRIGGER TỒN KHO', 'Giảm tồn kho khi xuất kho hợp lệ', exportOk, `Tồn ban đầu: ${initialStock} -> Sau xuất: ${prod2AfterExport.current_stock}`);

  // Xóa phiếu xuất thử nghiệm -> Trigger hoàn lại 5 chiếc vào tồn kho
  db.prepare(`DELETE FROM inventory_logs WHERE id = 'test_px_valid'`).run();
  const prod2Restored = db.prepare(`SELECT current_stock FROM products WHERE id = 'inv2'`).get() as any;
  const restoreOk = prod2Restored.current_stock === initialStock;
  record('TRIGGER TỒN KHO', 'Tự động hoàn trả tồn kho khi xóa phiếu xuất', restoreOk, `Tồn kho sau khi xóa phiếu: ${prod2Restored.current_stock}`);

  // ========================================================================
  // 6. KIỂM TRA LIÊN KẾT THANH TOÁN VỚI HÓA ĐƠN & CÔNG NỢ
  // ========================================================================
  console.log('\n--- 6. KIỂM TRA LIÊN KẾT THANH TOÁN VỚI INVOICE ---');

  // Lấy hóa đơn HDM001 (invc2) đang UNPAID với grandTotal = 11,880,000
  const invBefore = db.prepare(`SELECT id, grand_total, paid_amount, status FROM invoices WHERE id = 'invc2'`).get() as any;
  record('INVOICE PAYMENT', 'Trạng thái ban đầu HDM001', invBefore.status === 'UNPAID' && invBefore.paid_amount === 0, `paid_amount = ${invBefore.paid_amount}, status = ${invBefore.status}`);

  // Thanh toán một phần 5,000,000 qua cash_transactions liên kết invoice_id
  db.prepare(`
    INSERT INTO cash_transactions (
      id, code, date, type, person_name, reason, amount, opposite_account_code, fund_account_code, partner_id, invoice_id, created_by_name
    ) VALUES (
      'test_pay_partial', 'PC_TEST_01', '2026-08-25', 'CASH_PAYMENT', 'Garment Vina', 'Trả đợt 1', 5000000, '331', '1111', 'p3', 'invc2', 'Kế toán test'
    )
  `).run();

  const invPartial = db.prepare(`SELECT paid_amount, status FROM invoices WHERE id = 'invc2'`).get() as any;
  const partialOk = invPartial.paid_amount === 5000000 && invPartial.status === 'PARTIAL';
  record('INVOICE PAYMENT', 'Tự động cập nhật PARTIAL khi thanh toán 1 phần', partialOk, `paid_amount = ${invPartial.paid_amount}, status = ${invPartial.status}`);

  // Thanh toán nốt số tiền còn lại (6,880,000) -> Status phải tự động chuyển thành PAID
  db.prepare(`
    INSERT INTO cash_transactions (
      id, code, date, type, person_name, reason, amount, opposite_account_code, fund_account_code, partner_id, invoice_id, created_by_name
    ) VALUES (
      'test_pay_full', 'PC_TEST_02', '2026-08-26', 'BANK_WITHDRAWAL', 'Garment Vina', 'Trả nốt đợt 2', 6880000, '331', '1121', 'p3', 'invc2', 'Kế toán test'
    )
  `).run();

  const invPaid = db.prepare(`SELECT paid_amount, status FROM invoices WHERE id = 'invc2'`).get() as any;
  const paidOk = invPaid.paid_amount === 11880000 && invPaid.status === 'PAID';
  record('INVOICE PAYMENT', 'Tự động chuyển thành PAID khi trả đủ 100%', paidOk, `paid_amount = ${invPaid.paid_amount}, status = ${invPaid.status}`);

  // Xóa các giao dịch thanh toán thử nghiệm -> Status tự động quay về UNPAID
  db.prepare(`DELETE FROM cash_transactions WHERE id IN ('test_pay_partial', 'test_pay_full')`).run();
  const invRollback = db.prepare(`SELECT paid_amount, status FROM invoices WHERE id = 'invc2'`).get() as any;
  const rollbackOk = invRollback.paid_amount === 0 && invRollback.status === 'UNPAID';
  record('INVOICE PAYMENT', 'Tự động hoàn tác về UNPAID khi xóa phiếu chi', rollbackOk, `paid_amount = ${invRollback.paid_amount}, status = ${invRollback.status}`);

  // ========================================================================
  // 7. KIỂM TRA TÀI KHOẢN NGƯỜI DÙNG & MẬT KHẨU BĂM (BCRYPT)
  // ========================================================================
  console.log('\n--- 7. KIỂM TRA USERS & BCRYPT PASSWORD HASH ---');
  const directorUser = db.prepare(`SELECT username, password_hash, role FROM users WHERE username = 'quanly_duyen' OR username = 'director_dung'`).get() as any;
  const isHashValid = bcrypt.compareSync('123456', directorUser.password_hash);
  record('AUTH & USERS', 'Xác thực mật khẩu băm bcrypt', isHashValid, `Username: ${directorUser.username}, Role: ${directorUser.role}, verify('123456') = ${isHashValid}`);

  // ========================================================================
  // 8. KIỂM TRA INSERT / SELECT / UPDATE / DELETE (CRUD)
  // ========================================================================
  console.log('\n--- 8. KIỂM TRA CÁC THAO TÁC CRUD CƠ BẢN ---');

  // INSERT
  db.prepare(`
    INSERT INTO partners (id, code, name, type, phone, address, opening_debt_debit)
    VALUES ('p_crud_test', 'KH_CRUD_01', 'Khách hàng thử nghiệm CRUD', 'CUSTOMER', '0999888777', '123 Cầu Giấy, Hà Nội', 500000)
  `).run();
  const insertedPartner = db.prepare(`SELECT * FROM partners WHERE id = 'p_crud_test'`).get() as any;
  record('CRUD', 'INSERT Partner', !!insertedPartner && insertedPartner.name === 'Khách hàng thử nghiệm CRUD', 'Insert bản ghi mới thành công');

  // UPDATE
  db.prepare(`
    UPDATE partners SET phone = '0111222333', address = '456 Đống Đa, Hà Nội' WHERE id = 'p_crud_test'
  `).run();
  const updatedPartner = db.prepare(`SELECT phone, address FROM partners WHERE id = 'p_crud_test'`).get() as any;
  record('CRUD', 'UPDATE Partner', updatedPartner.phone === '0111222333', 'Update thông tin thành công');

  // DELETE
  db.prepare(`DELETE FROM partners WHERE id = 'p_crud_test'`).run();
  const deletedPartner = db.prepare(`SELECT * FROM partners WHERE id = 'p_crud_test'`).get() as any;
  record('CRUD', 'DELETE Partner', deletedPartner === undefined, 'Delete bản ghi thành công');

  // ========================================================================
  // TỔNG KẾT
  // ========================================================================
  const allPassed = results.every(r => r.passed);
  const totalCount = results.length;
  const passCount = results.filter(r => r.passed).length;
  const failCount = totalCount - passCount;

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM TRA: ${passCount}/${totalCount} TESTS PASSED (${allPassed ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI'})`);
  console.log('================================================================\n');

  return { passed: allPassed, results };
}

// Nếu chạy trực tiếp từ terminal
if (process.argv[1]?.includes('verify')) {
  try {
    const outcome = runVerification();
    if (!outcome.passed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Lỗi ngoại lệ khi chạy verification:', error);
    process.exit(1);
  }
}

import express from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import db from '../db/database.js';
import { SERVER_CONFIG } from './config.js';
import salesRoutes from './routes/salesRoutes.js';
import productRoutes from './routes/productRoutes.js';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(num: number, name: string, passed: boolean, details: string) {
  results.push({ num, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [TEST ${num}] ${name}: ${details}`);
}

async function runSalesTests() {
  console.log('\n================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA TOÀN DIỆN PHASE 5: BÁN HÀNG & HÓA ĐƠN (SALES)');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/products', productRoutes);
  app.use('/api/sales', salesRoutes);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  // Token Giám đốc (có quyền bán hàng)
  const directorToken = jwt.sign(
    { id: 'usr_emp_1', username: 'director_dung', role: 'DIRECTOR' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Token Thu ngân (có quyền bán hàng)
  const cashierToken = jwt.sign(
    { id: 'usr_emp_4', username: 'cashier_lan', role: 'SALES_CASHIER' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Token Quản lý kho (KHÔNG có quyền bán hàng -> kiểm tra RBAC)
  const warehouseToken = jwt.sign(
    { id: 'usr_emp_2', username: 'wh_hung', role: 'WAREHOUSE_MANAGER' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cashierToken}`
  };

  try {
    // Lấy thông tin đối tác & sản phẩm mẫu từ SQLite
    const customer = db.prepare("SELECT id, code, name FROM partners WHERE type = 'CUSTOMER' LIMIT 1").get() as any;
    const testProducts = db.prepare('SELECT id, code, name, selling_price, cost_price, current_stock FROM products WHERE current_stock >= 10 LIMIT 5').all() as any[];

    if (!customer || testProducts.length < 4) {
      throw new Error('Dữ liệu khách hàng hoặc sản phẩm không đủ để chạy test!');
    }

    const prod1 = testProducts[0];
    const prod2 = testProducts[1];
    const prod3 = testProducts[2];
    const prod4 = testProducts[3];

    // ------------------------------------------------------------------------
    // TEST 1: Tạo hóa đơn 1 sản phẩm
    // ------------------------------------------------------------------------
    console.log('--- 1. KIỂM TRA TẠO HÓA ĐƠN 1 SẢN PHẨM & TRỪ TỒN KHO ---');
    const p1InitialStock = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod1.id) as any).current_stock;
    const sellQty1 = 2;

    const res1 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        items: [
          { productId: prod1.id, quantity: sellQty1 }
        ],
        paidAmount: prod1.selling_price * sellQty1,
        note: 'Test 1: Tạo hóa đơn 1 sản phẩm'
      })
    });

    const data1 = await res1.json();
    const p1AfterStock = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod1.id) as any).current_stock;

    // Kiểm tra inventory log & inventory log items
    const invLog1 = db.prepare("SELECT id, code, type, invoice_id FROM inventory_logs WHERE invoice_id = ? AND type = 'EXPORT'").get(data1.invoice?.id) as any;
    const invLogItem1 = invLog1 ? db.prepare('SELECT quantity, movement_type FROM inventory_log_items WHERE inventory_log_id = ?').get(invLog1.id) as any : null;

    const passed1 = res1.status === 201 &&
      data1.success &&
      data1.invoice?.items?.length === 1 &&
      p1AfterStock === p1InitialStock - sellQty1 &&
      Boolean(invLog1) &&
      invLogItem1?.quantity === sellQty1 &&
      invLogItem1?.movement_type === 'EXPORT';

    record(
      1,
      'Tạo hóa đơn 1 sản phẩm (Lưu HĐ, trừ tồn kho, tạo phiếu xuất)',
      passed1,
      `Status: ${res1.status}, Mã HĐ: ${data1.invoice?.code}, Tồn trước: ${p1InitialStock} -> Sau: ${p1AfterStock} (Giảm ${sellQty1}), Phiếu xuất: ${invLog1?.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Tạo hóa đơn có 3 sản phẩm
    // ------------------------------------------------------------------------
    console.log('\n--- 2. KIỂM TRA TẠO HÓA ĐƠN 3 SẢN PHẨM & TÍNH TIỀN CHÍNH XÁC ---');
    const p2StockBefore = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod2.id) as any).current_stock;
    const p3StockBefore = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod3.id) as any).current_stock;
    const p4StockBefore = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod4.id) as any).current_stock;

    const res2 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        items: [
          { productId: prod2.id, quantity: 1 },
          { productId: prod3.id, quantity: 2 },
          { productId: prod4.id, quantity: 1 }
        ],
        note: 'Test 2: Tạo hóa đơn 3 sản phẩm'
      })
    });

    const data2 = await res2.json();
    const p2StockAfter = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod2.id) as any).current_stock;
    const p3StockAfter = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod3.id) as any).current_stock;
    const p4StockAfter = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod4.id) as any).current_stock;

    const expectedTotal2 = (prod2.selling_price * 1) + (prod3.selling_price * 2) + (prod4.selling_price * 1);
    const passed2 = res2.status === 201 &&
      data2.invoice?.items?.length === 3 &&
      data2.invoice?.grandTotal === expectedTotal2 &&
      p2StockAfter === p2StockBefore - 1 &&
      p3StockAfter === p3StockBefore - 2 &&
      p4StockAfter === p4StockBefore - 1;

    record(
      2,
      'Tạo hóa đơn có 3 sản phẩm (3 items, tổng tiền đúng, cả 3 đều trừ tồn đúng)',
      passed2,
      `Status: ${res2.status}, Số items: ${data2.invoice?.items?.length}, Tổng tiền backend tự tính: ${data2.invoice?.grandTotal?.toLocaleString('vi-VN')} ₫ (Kỳ vọng: ${expectedTotal2.toLocaleString('vi-VN')} ₫)`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Thanh toán đủ
    // ------------------------------------------------------------------------
    console.log('\n--- 3. KIỂM TRA THANH TOÁN ĐỦ (PAID, DEBT = 0, GHI SỔ QUỸ) ---');
    const res3 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        items: [{ productId: prod1.id, quantity: 1 }],
        paymentMethod: 'CASH',
        customerCash: prod1.selling_price + 50000,
        paidAmount: prod1.selling_price,
        note: 'Test 3: Thanh toán đủ tiền'
      })
    });

    const data3 = await res3.json();
    const cashTx3 = db.prepare('SELECT id, code, type, amount, fund_account_code, opposite_account_code FROM cash_transactions WHERE invoice_id = ?').get(data3.invoice?.id) as any;

    const passed3 = res3.status === 201 &&
      data3.invoice?.status === 'PAID' &&
      data3.invoice?.paidAmount === prod1.selling_price &&
      data3.debt === 0 &&
      data3.change === 50000 &&
      Boolean(cashTx3) &&
      cashTx3.amount === prod1.selling_price &&
      cashTx3.type === 'CASH_RECEIPT' &&
      cashTx3.opposite_account_code === '511';

    record(
      3,
      'Thanh toán đủ (paid_amount = total, debt = 0, status = PAID, tạo cash transaction)',
      passed3,
      `Mã HĐ: ${data3.invoice?.code}, Trạng thái: ${data3.invoice?.status}, Nợ: ${data3.debt} ₫, Tiền thừa: ${data3.change?.toLocaleString('vi-VN')} ₫, Phiếu thu: ${cashTx3?.code} (${cashTx3?.amount?.toLocaleString('vi-VN')} ₫)`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Thanh toán một phần
    // ------------------------------------------------------------------------
    console.log('\n--- 4. KIỂM TRA THANH TOÁN MỘT PHẦN (PARTIAL, DEBT > 0) ---');
    const total4 = prod1.selling_price * 2;
    const partialPay = Math.round(total4 / 2);

    const res4 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        items: [{ productId: prod1.id, quantity: 2 }],
        paidAmount: partialPay,
        paymentMethod: 'BANK',
        note: 'Test 4: Thanh toán 50% trước qua VietQR'
      })
    });

    const data4 = await res4.json();
    const cashTx4 = db.prepare('SELECT id, code, type, amount, fund_account_code FROM cash_transactions WHERE invoice_id = ?').get(data4.invoice?.id) as any;

    const passed4 = res4.status === 201 &&
      data4.invoice?.status === 'PARTIAL' &&
      data4.invoice?.paidAmount === partialPay &&
      data4.debt === (total4 - partialPay) &&
      Boolean(cashTx4) &&
      cashTx4.amount === partialPay &&
      cashTx4.type === 'BANK_DEPOSIT';

    record(
      4,
      'Thanh toán một phần (paid_amount < total, debt > 0, status = PARTIAL)',
      passed4,
      `Mã HĐ: ${data4.invoice?.code}, Đã trả: ${data4.invoice?.paidAmount?.toLocaleString('vi-VN')} ₫, Còn nợ: ${data4.debt?.toLocaleString('vi-VN')} ₫, Trạng thái: ${data4.invoice?.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Không thanh toán (Ghi nợ 100%)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. KIỂM TRA KHÔNG THANH TOÁN (UNPAID, DEBT = TOTAL) ---');
    const total5 = prod2.selling_price * 1;

    const res5 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        items: [{ productId: prod2.id, quantity: 1 }],
        paymentMethod: 'DEBT',
        paidAmount: 0,
        note: 'Test 5: Khách mua chịu nợ 100%'
      })
    });

    const data5 = await res5.json();
    const cashTx5 = db.prepare('SELECT id FROM cash_transactions WHERE invoice_id = ?').get(data5.invoice?.id);

    const passed5 = res5.status === 201 &&
      data5.invoice?.status === 'UNPAID' &&
      data5.invoice?.paidAmount === 0 &&
      data5.debt === total5 &&
      cashTx5 === undefined; // KHÔNG được tạo giao dịch tiền khi paid_amount = 0

    record(
      5,
      'Không thanh toán (paid_amount = 0, debt = total, status = UNPAID, không tạo cash transaction)',
      passed5,
      `Mã HĐ: ${data5.invoice?.code}, Đã trả: 0 ₫, Còn nợ: ${data5.debt?.toLocaleString('vi-VN')} ₫, Trạng thái: ${data5.invoice?.status}, Có phiếu thu: ${Boolean(cashTx5)}`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Bán vượt tồn (quantity > current_stock)
    // ------------------------------------------------------------------------
    console.log('\n--- 6. KIỂM TRA CHẶN BÁN VƯỢT TỒN KHO ---');
    const prodCurrentStock = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod1.id) as any).current_stock;
    const excessiveQty = prodCurrentStock + 50;

    const res6 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        items: [{ productId: prod1.id, quantity: excessiveQty }],
        paidAmount: 1000000
      })
    });

    const data6 = await res6.json();
    const stockAfterRejected = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod1.id) as any).current_stock;

    const passed6 = res6.status === 400 &&
      !data6.success &&
      data6.error &&
      data6.error.includes('chỉ còn') &&
      data6.error.includes('không thể bán') &&
      stockAfterRejected === prodCurrentStock;

    record(
      6,
      'Bán vượt tồn kho (REJECT 400, stock giữ nguyên, không tạo HĐ)',
      passed6,
      `Status: ${res6.status}, Thông báo lỗi: "${data6.error}", Tồn kho trước & sau: ${prodCurrentStock} (Không bị trừ)`
    );

    // ------------------------------------------------------------------------
    // TEST 7: Hai sản phẩm: 1 đủ tồn, 1 thiếu tồn -> Transaction Rollback
    // ------------------------------------------------------------------------
    console.log('\n--- 7. KIỂM TRA ATOMIC TRANSACTION ROLLBACK KHI 1 SẢN PHẨM THIẾU TỒN ---');
    const p1StockPre = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod1.id) as any).current_stock;
    const p2StockPre = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod2.id) as any).current_stock;
    const excessiveQty2 = p2StockPre + 999;

    const res7 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        items: [
          { productId: prod1.id, quantity: 1 }, // Đủ tồn
          { productId: prod2.id, quantity: excessiveQty2 } // Thiếu tồn
        ]
      })
    });

    const data7 = await res7.json();
    const p1StockPost = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod1.id) as any).current_stock;
    const p2StockPost = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prod2.id) as any).current_stock;

    const passed7 = res7.status === 400 &&
      p1StockPost === p1StockPre &&
      p2StockPost === p2StockPre;

    record(
      7,
      'Atomic Transaction Rollback (Một sản phẩm đủ, một sản phẩm thiếu -> Rollback toàn bộ)',
      passed7,
      `Status: ${res7.status}, Prod 1: ${p1StockPre} -> ${p1StockPost} (Không đổi), Prod 2: ${p2StockPre} -> ${p2StockPost} (Không đổi)`
    );

    // ------------------------------------------------------------------------
    // TEST 8: Reload website / Tính bền vững từ Database (GET /api/sales)
    // ------------------------------------------------------------------------
    console.log('\n--- 8. KIỂM TRA DỮ LIỆU BỀN VỮNG TỪ DATABASE (GET /api/sales) ---');
    const res8 = await fetch(`${baseUrl}/sales`, { headers });
    const salesList = await res8.json();

    const createdInvoicesFound = Array.isArray(salesList) &&
      salesList.some((s: any) => s.id === data1.invoice?.id) &&
      salesList.some((s: any) => s.id === data2.invoice?.id) &&
      salesList.some((s: any) => s.id === data3.invoice?.id);

    const passed8 = res8.status === 200 && createdInvoicesFound;

    record(
      8,
      'Kiểm tra dữ liệu bền vững (GET /api/sales tải lại từ SQLite thật)',
      passed8,
      `Status: ${res8.status}, Tổng số hóa đơn bán hàng đọc từ DB: ${salesList.length}, Các HĐ vừa tạo đều tồn tại: ${createdInvoicesFound}`
    );

    // ------------------------------------------------------------------------
    // TEST 9: Phân quyền RBAC (Role không có quyền bán hàng -> 403)
    // ------------------------------------------------------------------------
    console.log('\n--- 9. KIỂM TRA PHÂN QUYỀN RBAC (WAREHOUSE_MANAGER -> 403 FORBIDDEN) ---');
    const warehouseHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${warehouseToken}`
    };

    const res9 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: warehouseHeaders,
      body: JSON.stringify({
        partnerId: customer.id,
        items: [{ productId: prod1.id, quantity: 1 }]
      })
    });

    const data9 = await res9.json();
    const passed9 = res9.status === 403 && !data9.success;

    record(
      9,
      'Kiểm tra RBAC (Nhân viên kho không có quyền bán hàng -> chặn 403 Forbidden)',
      passed9,
      `Status: ${res9.status}, Thông báo chặn: "${data9.error}"`
    );

    // ------------------------------------------------------------------------
    // TEST 10: npm run lint & npm run build
    // ------------------------------------------------------------------------
    console.log('\n--- 10. KIỂM TRA LINT & BUILD SYSTEM ---');
    let lintOk = false;
    let buildOk = false;

    try {
      execSync('npm run lint', { stdio: 'pipe' });
      lintOk = true;
    } catch {
      lintOk = false;
    }

    try {
      execSync('npm run build', { stdio: 'pipe' });
      buildOk = true;
    } catch {
      buildOk = false;
    }

    const passed10 = lintOk && buildOk;
    record(
      10,
      'Kiểm tra npm run lint & npm run build',
      passed10,
      `Lint: ${lintOk ? 'PASS' : 'FAIL'}, Build: ${buildOk ? 'PASS' : 'FAIL'}`
    );

  } finally {
    server.close();
  }

  // Tổng kết kết quả
  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM TRA PHASE 5 (SALES & INVOICES)');
  console.log('================================================================');
  const allPassed = results.every(r => r.passed);
  const passCount = results.filter(r => r.passed).length;
  console.log(`\nKết quả: ${passCount}/${results.length} tests đạt yêu cầu.`);

  if (allPassed) {
    console.log('🎉 TẤT CẢ 10/10 TEST PHASE 5 ĐỀU ĐẠT YÊU CẦU!');
  } else {
    console.error('❌ CÓ TEST THẤT BẠI!');
    process.exit(1);
  }
}

runSalesTests().catch(err => {
  console.error('Lỗi khi chạy kiểm tra bán hàng:', err);
  process.exit(1);
});

import express from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { SERVER_CONFIG } from './config.js';
import productRoutes from './routes/productRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';

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

async function runInitialStockTests() {
  console.log('\n================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA TOÀN DIỆN PHASE 4.1: BỔ SUNG TỒN KHO BAN ĐẦU');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json());

  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/inventory', inventoryRoutes);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const directorToken = jwt.sign(
    { id: 'usr_emp_1', username: 'director_dung', role: 'DIRECTOR' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${directorToken}`
  };

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Kiểm tra 140 sản phẩm import tồn tại trong SQLite database
    // ------------------------------------------------------------------------
    console.log('--- 1. KIỂM TRA 140 SẢN PHẨM IMPORT TỒN TẠI TRONG CƠ SỞ DỮ LIỆU ---');
    const totalProductsCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as any).count;
    const passed1 = totalProductsCount >= 140;
    record(
      1,
      '140 sản phẩm tồn tại trong database',
      passed1,
      `Tổng số sản phẩm hiện có trong database: ${totalProductsCount} (Kỳ vọng: >= 140)`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Kiểm tra tất cả sản phẩm đều có tồn kho > 0
    // ------------------------------------------------------------------------
    console.log('\n--- 2. KIỂM TRA TẤT CẢ SẢN PHẨM ĐỀU CÓ TỒN KHO > 0 ---');
    const zeroStockProducts = db.prepare('SELECT id, code, name, current_stock FROM products WHERE current_stock = 0').all();
    const passed2 = zeroStockProducts.length === 0;
    record(
      2,
      '100% sản phẩm có tồn kho > 0 (không còn sản phẩm tồn 0)',
      passed2,
      `Số sản phẩm tồn 0 hiện tại: ${zeroStockProducts.length}/148 sản phẩm`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Kiểm tra tồn kho hiển thị đúng trên API /api/products
    // ------------------------------------------------------------------------
    console.log('\n--- 3. KIỂM TRA TỒN KHO TRẢ VỀ TỪ API GET /api/products ---');
    const productsRes = await fetch(`${baseUrl}/products`, { headers });
    const productsJson = await productsRes.json();
    const productsList = productsJson.data || productsJson;
    const allHaveStock = Array.isArray(productsList) && productsList.length > 0 && productsList.every((p: any) => p.currentStock > 0 && p.openingQuantity > 0);
    record(
      3,
      'Tồn kho hiển thị đúng trên API GET /api/products',
      allHaveStock,
      `API trả về: ${productsList.length} sản phẩm, 100% có currentStock & openingQuantity > 0: ${allHaveStock}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Kiểm tra phiếu nhập kho ban đầu inventory_logs tồn tại
    // ------------------------------------------------------------------------
    console.log('\n--- 4. KIỂM TRA PHIẾU NHẬP KHO BAN ĐẦU TRONG INVENTORY_LOGS ---');
    const initLog = db.prepare("SELECT * FROM inventory_logs WHERE invoice_ref = 'INITIAL_STOCK'").get() as any;
    const passed4 = Boolean(initLog && initLog.type === 'IMPORT' && initLog.opposite_account_code === '411');
    record(
      4,
      'Inventory log được tạo (type = IMPORT, ref = INITIAL_STOCK, TK 411)',
      passed4,
      `Mã phiếu kho: ${initLog?.code}, Loại: ${initLog?.type}, Tham chiếu: ${initLog?.invoice_ref}, Giá trị: ${initLog?.total_value?.toLocaleString('vi-VN')} ₫, TK đối ứng: ${initLog?.opposite_account_code}`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Kiểm tra chi tiết phiếu kho inventory_log_items tương ứng
    // ------------------------------------------------------------------------
    console.log('\n--- 5. KIỂM TRA CHI TIẾT DÒNG HÀNG TRONG INVENTORY_LOG_ITEMS ---');
    const logItems = initLog ? db.prepare('SELECT COUNT(*) as count FROM inventory_log_items WHERE inventory_log_id = ?').get(initLog.id) as any : { count: 0 };
    const passed5 = logItems.count >= 138;
    record(
      5,
      'Chi tiết phiếu nhập kho inventory_log_items được lưu đầy đủ',
      passed5,
      `Số dòng chi tiết phiếu kho ban đầu: ${logItems.count} dòng`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Tổng tồn kho và tổng giá trị tồn kho được cập nhật (SUM(current_stock * cost_price))
    // ------------------------------------------------------------------------
    console.log('\n--- 6. KIỂM TRA TỔNG TỒN KHO & TỔNG GIÁ TRỊ TỒN KHO ---');
    const summaryRes = await fetch(`${baseUrl}/inventory/summary`, { headers });
    const summaryData = await summaryRes.json();
    const sumQty = summaryData.summary?.totalStockQuantity;
    const sumVal = summaryData.summary?.totalInventoryValue;
    const passed6 = summaryRes.status === 200 && sumQty > 2000 && sumVal > 600000000;
    record(
      6,
      'Tổng tồn kho và tổng giá trị tồn kho dashboard cập nhật động',
      passed6,
      `Tổng số lượng: ${sumQty?.toLocaleString('vi-VN')} sản phẩm, Tổng giá trị tồn (TK 156): ${sumVal?.toLocaleString('vi-VN')} ₫`
    );

    // ------------------------------------------------------------------------
    // TEST 7: Kiểm tra giá bán < 1.000.000 ₫
    // ------------------------------------------------------------------------
    console.log('\n--- 7. KIỂM TRA GIÁ BÁN TOÀN BỘ SẢN PHẨM < 1.000.000 ₫ ---');
    const maxSalePrice = (db.prepare('SELECT MAX(selling_price) as max_price FROM products').get() as any).max_price;
    const passed7 = maxSalePrice < 1000000 && maxSalePrice <= 999000;
    record(
      7,
      'Giá bán sản phẩm < 1.000.000 ₫ (tối đa 999.000 ₫)',
      passed7,
      `Giá bán cao nhất trong hệ thống: ${maxSalePrice?.toLocaleString('vi-VN')} ₫ (< 1.000.000 ₫)`
    );

    // ------------------------------------------------------------------------
    // TEST 8: Kiểm tra giá nhập < giá bán (55% - 75%)
    // ------------------------------------------------------------------------
    console.log('\n--- 8. KIỂM TRA GIÁ NHẬP / VỐN < GIÁ BÁN ---');
    const invalidPriceProducts = db.prepare('SELECT code, name, cost_price, selling_price FROM products WHERE cost_price >= selling_price').all();
    const passed8 = invalidPriceProducts.length === 0;
    record(
      8,
      'Giá nhập < Giá bán trên 100% sản phẩm',
      passed8,
      `Số sản phẩm có giá nhập >= giá bán: ${invalidPriceProducts.length} (Kỳ vọng: 0)`
    );

    // ------------------------------------------------------------------------
    // TEST 9: Reload/Re-query không làm thay đổi tồn kho (Tính tất định & bền vững)
    // ------------------------------------------------------------------------
    console.log('\n--- 9. KIỂM TRA TÍNH BỀN VỮNG KHI RELOAD TRANG / TRUY VẤN LẶP LẠI ---');
    const check1 = db.prepare('SELECT current_stock FROM products WHERE code = ?').get('AK001') as any;
    const resAgain = await fetch(`${baseUrl}/products`, { headers });
    const jsonAgain = await resAgain.json();
    const listAgain = jsonAgain.data || jsonAgain;
    const check2 = listAgain.find((p: any) => p.code === 'AK001');
    const passed9 = Boolean(check1 && check2 && check1.current_stock === check2.currentStock && check1.current_stock > 0);
    record(
      9,
      'Reload không làm thay đổi tồn kho (Bền vững & Tất định)',
      passed9,
      `Mã AK001: Tồn kho DB = ${check1?.current_stock}, Tồn kho API query lại = ${check2?.currentStock}`
    );

    // ------------------------------------------------------------------------
    // TEST 10: Không tạo duplicate products trong bảng products
    // ------------------------------------------------------------------------
    console.log('\n--- 10. KIỂM TRA KHÔNG TẠO SẢN PHẨM TRÙNG LẶP ---');
    const dupCodes = db.prepare('SELECT code, COUNT(*) as count FROM products GROUP BY code HAVING count > 1').all();
    const passed10 = dupCodes.length === 0;
    record(
      10,
      'Không tạo duplicate products (Mã SKU duy nhất)',
      passed10,
      `Số mã sản phẩm bị trùng lặp: ${dupCodes.length}`
    );

    // ------------------------------------------------------------------------
    // TEST 11: Không ảnh hưởng đến module Mua hàng (Purchase)
    // ------------------------------------------------------------------------
    console.log('\n--- 11. KIỂM TRA KHÔNG ẢNH HƯỞNG ĐẾN PURCHASE MODULE ---');
    const purchasesRes = await fetch(`${baseUrl}/purchases`, { headers });
    const purchasesData = await purchasesRes.json();
    const passed11 = purchasesRes.status === 200 && Array.isArray(purchasesData) && purchasesData.length > 0;
    record(
      11,
      'Không ảnh hưởng Purchase Module',
      passed11,
      `API GET /api/purchases hoạt động bình thường, hiện có: ${purchasesData.length} hóa đơn mua hàng`
    );

    // ------------------------------------------------------------------------
    // TEST 12: Kiểm tra Trigger chống xuất kho vượt quá tồn kho (Không cho bán vượt tồn)
    // ------------------------------------------------------------------------
    console.log('\n--- 12. KIỂM TRA TRIGGER CHỐNG XUẤT KHO VƯỢT QUÁ TỒN KHO ---');
    const sampleProduct = db.prepare('SELECT id, code, current_stock FROM products WHERE code = ?').get('AK001') as any;
    const currentStockAK001 = sampleProduct.current_stock;
    const excessiveQuantity = currentStockAK001 + 1000; // Xuất vượt tồn kho

    let triggerCaught = false;
    let triggerErrorMessage = '';

    try {
      db.transaction(() => {
        const testLogId = `test_export_log_${Date.now()}`;
        db.prepare(`
          INSERT INTO inventory_logs (id, code, date, type, warehouse_name, created_at)
          VALUES (?, ?, date('now'), 'EXPORT', 'Kho Tổng', datetime('now'))
        `).run(testLogId, `PXK-TEST-${Date.now().toString().slice(-4)}`);

        db.prepare(`
          INSERT INTO inventory_log_items (id, inventory_log_id, product_id, movement_type, item_code, item_name, unit, quantity)
          VALUES (?, ?, ?, 'EXPORT', ?, 'Áo Khoác Test', 'Cái', ?)
        `).run(`item_test_${Date.now()}`, testLogId, sampleProduct.id, sampleProduct.code, excessiveQuantity);
      })();
    } catch (err: any) {
      triggerCaught = true;
      triggerErrorMessage = err.message;
    }

    const passed12 = triggerCaught && triggerErrorMessage.includes('Số lượng tồn kho không đủ');
    record(
      12,
      'Trigger chống xuất/bán vượt quá tồn kho (ABORT)',
      passed12,
      `Thử xuất ${excessiveQuantity} cái (Tồn: ${currentStockAK001}) -> Trigger chặn chính xác: "${triggerErrorMessage}"`
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // Tổng kết kết quả
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM TRA PHASE 4.1: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================\n');

  if (passed < total) {
    process.exit(1);
  }
}

runInitialStockTests().catch(err => {
  console.error('Lỗi khi chạy test Phase 4.1:', err);
  process.exit(1);
});

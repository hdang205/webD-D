import express from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { SERVER_CONFIG } from './config.js';
import productRoutes from './routes/productRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
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

async function runPurchaseTests() {
  console.log('\n================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA TOÀN DIỆN PHASE 4: IMPORT + MUA HÀNG + TỒN KHO');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/purchases', purchaseRoutes);

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
    // TEST 1: Import Excel DD_products_import.xlsx
    // ------------------------------------------------------------------------
    console.log('--- 1. KIỂM TRA IMPORT EXCEL 140 SẢN PHẨM & SINH GIÁ ---');
    const importRes = await fetch(`${baseUrl}/products/import`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    const importData = await importRes.json();
    const passed1 = importRes.status === 201 && importData.success && importData.stats.success === 140;
    record(
      1,
      'Import Excel 140 sản phẩm',
      passed1,
      `Status: ${importRes.status}, Số lượng import: ${importData.stats?.success}/140 sản phẩm, Giá TB: ${importData.stats?.pricing?.avgSalePrice?.toLocaleString('vi-VN')} ₫`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Kiểm tra Category không duplicate
    // ------------------------------------------------------------------------
    console.log('\n--- 2. KIỂM TRA QUẢN LÝ DANH MỤC & CHỐNG DUPLICATE ---');
    const allCategories = db.prepare('SELECT id, name FROM categories').all() as { id: string; name: string }[];
    const categoryNames = allCategories.map(c => c.name.trim().toLowerCase());
    const uniqueCategoryNames = new Set(categoryNames);
    const hasDuplicateCategories = categoryNames.length !== uniqueCategoryNames.size;

    record(
      2,
      'Kiểm tra Category không bị duplicate',
      !hasDuplicateCategories,
      `Tổng số danh mục: ${allCategories.length}, Không trùng lặp: ${!hasDuplicateCategories}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Kiểm tra ảnh SP01 hiển thị đúng đường dẫn
    // ------------------------------------------------------------------------
    console.log('\n--- 3. KIỂM TRA ĐƯỜNG DẪN ẢNH SẢN PHẨM ---');
    const sp01 = db.prepare('SELECT code, name, image_url, cost_price, selling_price, current_stock FROM products WHERE code = ?').get('SP01') as any;
    const passed3 = Boolean(sp01 && sp01.image_url && sp01.image_url.includes('/images/products/SP01'));
    record(
      3,
      'Kiểm tra ảnh sản phẩm SP01',
      passed3,
      `Mã: ${sp01?.code}, Tên: "${sp01?.name}", Image URL: "${sp01?.image_url}", Giá bán: ${sp01?.selling_price?.toLocaleString('vi-VN')} ₫, Giá vốn: ${sp01?.cost_price?.toLocaleString('vi-VN')} ₫`
    );

    // Lấy nhà cung cấp hợp lệ để tạo đơn mua hàng
    const supplier = db.prepare("SELECT id, name FROM partners WHERE type IN ('SUPPLIER', 'BOTH') LIMIT 1").get() as any;
    if (!supplier) {
      throw new Error('Database chưa có nhà cung cấp để thực hiện test mua hàng.');
    }

    // ------------------------------------------------------------------------
    // TEST 4: Tạo phiếu nhập 1 sản phẩm
    // ------------------------------------------------------------------------
    console.log('\n--- 4. KIỂM TRA LẬP PHIẾU MUA HÀNG 1 SẢN PHẨM ---');
    const initialStockSP01 = Number(sp01?.current_stock || 0);

    const purchaseRes1 = await fetch(`${baseUrl}/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: supplier.id,
        note: 'Phiếu nhập 1 sản phẩm SP01 kiểm thử',
        paidAmount: 2000000,
        items: [
          {
            itemCode: 'SP01',
            quantity: 10,
            unitPrice: 200000
          }
        ]
      })
    });

    const purchaseData1 = await purchaseRes1.json();
    const passed4 = purchaseRes1.status === 201 && purchaseData1.success && purchaseData1.invoice?.grandTotal === 2000000;
    record(
      4,
      'Tạo phiếu nhập 1 sản phẩm',
      passed4,
      `Status: ${purchaseRes1.status}, Mã HĐ: ${purchaseData1.invoice?.code}, Tổng tiền: ${purchaseData1.invoice?.grandTotal?.toLocaleString('vi-VN')} ₫, Trạng thái: ${purchaseData1.invoice?.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Tạo phiếu nhập nhiều sản phẩm (SP01: 10 × 200k + SP02: 5 × 250k = 3,250,000)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. KIỂM TRA LẬP PHIẾU NHIỀU SẢN PHẨM & TÍNH TỔNG TIỀN ---');
    const sp02Before = db.prepare('SELECT current_stock FROM products WHERE code = ?').get('SP02') as any;
    const initialStockSP02 = Number(sp02Before?.current_stock || 0);

    const purchaseRes2 = await fetch(`${baseUrl}/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: supplier.id,
        note: 'Phiếu nhập nhiều sản phẩm SP01 và SP02',
        paidAmount: 0, // Công nợ chưa trả
        items: [
          {
            itemCode: 'SP01',
            quantity: 10,
            unitPrice: 200000
          },
          {
            itemCode: 'SP02',
            quantity: 5,
            unitPrice: 250000
          }
        ]
      })
    });

    const purchaseData2 = await purchaseRes2.json();
    const expectedTotal = (10 * 200000) + (5 * 250000); // 3,250,000
    const passed5 = purchaseRes2.status === 201 && purchaseData2.invoice?.grandTotal === expectedTotal;
    record(
      5,
      'Tạo phiếu nhập nhiều sản phẩm (SP01: 10 × 200k, SP02: 5 × 250k)',
      passed5,
      `Status: ${purchaseRes2.status}, Tổng tiền backend tự tính: ${purchaseData2.invoice?.grandTotal?.toLocaleString('vi-VN')} ₫ (Kỳ vọng: ${expectedTotal.toLocaleString('vi-VN')} ₫)`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Kiểm tra tính toàn vẹn database (invoices, invoice_items, inventory_logs)
    // ------------------------------------------------------------------------
    console.log('\n--- 6. KIỂM TRA LIÊN KẾT DATABASE & TOÀN VẸN DỮ LIỆU ---');
    const invId = purchaseData2.invoice?.id;
    const dbInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId) as any;
    const dbInvoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invId) as any[];
    const dbInventoryLog = db.prepare('SELECT * FROM inventory_logs WHERE invoice_id = ?').get(invId) as any;
    const dbLogItems = dbInventoryLog ? db.prepare('SELECT * FROM inventory_log_items WHERE inventory_log_id = ?').all(dbInventoryLog.id) as any[] : [];

    const passed6 = Boolean(
      dbInvoice &&
      dbInvoiceItems.length === 2 &&
      dbInventoryLog &&
      dbLogItems.length === 2
    );

    record(
      6,
      'Kiểm tra database: invoices, invoice_items, inventory_logs tồn tại đồng bộ',
      passed6,
      `Hóa đơn: ${dbInvoice?.code}, Chi tiết HĐ: ${dbInvoiceItems.length} dòng, Phiếu kho: ${dbInventoryLog?.code}, Chi tiết kho: ${dbLogItems.length} dòng`
    );

    // ------------------------------------------------------------------------
    // TEST 7: Kiểm tra tăng tồn kho (Trước = 0, Nhập = 10, Sau = 10)
    // ------------------------------------------------------------------------
    console.log('\n--- 7. KIỂM TRA TỰ ĐỘNG TĂNG TỒN KHO QUA TRIGGER ---');
    const sp02After = db.prepare('SELECT current_stock FROM products WHERE code = ?').get('SP02') as any;
    const finalStockSP02 = Number(sp02After?.current_stock || 0);
    const passed7 = finalStockSP02 === initialStockSP02 + 5; // Nhập 5 cái

    const sp01After = db.prepare('SELECT current_stock FROM products WHERE code = ?').get('SP01') as any;
    const finalStockSP01 = Number(sp01After?.current_stock || 0);

    record(
      7,
      'Kiểm tra tự động tăng tồn kho (new_stock = old_stock + quantity)',
      passed7,
      `SP02: Tồn trước = ${initialStockSP02} -> Nhập = 5 -> Tồn sau = ${finalStockSP02}. SP01: Tồn trước = ${initialStockSP01} -> Tổng nhập 20 -> Tồn sau = ${finalStockSP01}`
    );

    // ------------------------------------------------------------------------
    // TEST 8: Kiểm tra dữ liệu bền vững (Persistence across queries / reloads)
    // ------------------------------------------------------------------------
    console.log('\n--- 8. KIỂM TRA TÍNH BỀN VỮNG CỦA DỮ LIỆU ---');
    const reloadedPurchases = await fetch(`${baseUrl}/purchases`, { headers });
    const purchasesList = await reloadedPurchases.json();
    const foundInvoice = Array.isArray(purchasesList) && purchasesList.some((p: any) => p.id === invId);

    record(
      8,
      'Kiểm tra dữ liệu bền vững (GET /api/purchases)',
      foundInvoice,
      `Danh sách hóa đơn mua hàng nạp lại từ SQLite: ${purchasesList.length} đơn, Hóa đơn vừa tạo tồn tại: ${foundInvoice}`
    );

    // ------------------------------------------------------------------------
    // TEST 9: Validation: Nhập quantity = 0 bị từ chối
    // ------------------------------------------------------------------------
    console.log('\n--- 9. KIỂM TRA VALIDATION CHẶN SỐ LƯỢNG <= 0 ---');
    const badQtyRes = await fetch(`${baseUrl}/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: supplier.id,
        items: [
          {
            itemCode: 'SP01',
            quantity: 0,
            unitPrice: 200000
          }
        ]
      })
    });

    const badQtyData = await badQtyRes.json();
    const passed9 = badQtyRes.status === 400 && !badQtyData.success;
    record(
      9,
      'Chặn nhập số lượng = 0 (HTTP 400)',
      passed9,
      `Status: ${badQtyRes.status}, Bắt lỗi: "${badQtyData.error}"`
    );

    // ------------------------------------------------------------------------
    // TEST 10: Validation: Nhập price < 0 bị từ chối
    // ------------------------------------------------------------------------
    console.log('\n--- 10. KIỂM TRA VALIDATION CHẶN ĐƠN GIÁ ÂM ---');
    const badPriceRes = await fetch(`${baseUrl}/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: supplier.id,
        items: [
          {
            itemCode: 'SP01',
            quantity: 5,
            unitPrice: -50000
          }
        ]
      })
    });

    const badPriceData = await badPriceRes.json();
    const passed10 = badPriceRes.status === 400 && !badPriceData.success;
    record(
      10,
      'Chặn nhập đơn giá < 0 (HTTP 400)',
      passed10,
      `Status: ${badPriceRes.status}, Bắt lỗi: "${badPriceData.error}"`
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // Tổng kết kết quả
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM TRA PHASE 4: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================\n');

  if (passed < total) {
    process.exit(1);
  }
}

runPurchaseTests().catch(err => {
  console.error('Lỗi khi chạy test Phase 4:', err);
  process.exit(1);
});

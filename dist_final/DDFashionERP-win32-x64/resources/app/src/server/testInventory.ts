import express from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import db from '../db/database.js';
import { SERVER_CONFIG } from './config.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import authRoutes from './routes/authRoutes.js';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    results.push({ name: testName, passed: true, message: detail });
    console.log(`  ✅ [PASS] ${testName}${detail ? ` - ${detail}` : ''}`);
  } else {
    results.push({ name: testName, passed: false, message: detail });
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

function ensureTestProduct(id: string, code: string, name: string, stock: number, costPrice = 100000, sellingPrice = 200000) {
  const existing = db.prepare('SELECT id FROM products WHERE id = ? OR code = ?').get(id, code) as any;
  if (existing) {
    db.prepare('UPDATE products SET current_stock = ?, cost_price = ?, selling_price = ? WHERE id = ?')
      .run(stock, costPrice, sellingPrice, existing.id);
    return existing.id;
  } else {
    db.prepare(`
      INSERT INTO products (
        id, code, name, unit, category_id, cost_price, selling_price,
        opening_quantity, opening_value, current_stock, min_stock_level, description
      ) VALUES (
        ?, ?, ?, 'Cái', 'cat_somi', ?, ?,
        ?, ?, ?, 5, 'Sản phẩm kiểm thử Phase 6'
      )
    `).run(id, code, name, costPrice, sellingPrice, stock, stock * costPrice, stock);
    return id;
  }
}

async function runInventoryTests() {
  console.log('\n================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA TOÀN DIỆN PHASE 6: QUẢN LÝ KHO & TỒN KHO');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/auth', authRoutes);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  // Tokens
  const directorToken = jwt.sign(
    { id: 'usr_emp_1', username: 'director_dung', role: 'DIRECTOR' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const salesStaffToken = jwt.sign(
    { id: 'usr_emp_8', username: 'sales_lan', role: 'SALES_STAFF' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const directorHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${directorToken}`
  };

  const salesStaffHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${salesStaffToken}`
  };

  try {
    // --------------------------------------------------------------------------
    // TEST 1 – INITIAL STOCK
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 1 – INITIAL STOCK ---');
    const prodT1 = ensureTestProduct('prod_test_p6_01', 'P6_T01', 'Áo Sơ Mi Test Initial Stock', 10);
    const resT1 = await fetch(`${baseUrl}/inventory/${prodT1}`, { headers: directorHeaders });
    const dataT1 = await resT1.json() as any;
    assert(
      dataT1.success && dataT1.product.currentStock === 10,
      'TEST 1 – INITIAL STOCK',
      `Tồn ban đầu: 10, Kết quả: ${dataT1.product?.currentStock}`
    );

    // --------------------------------------------------------------------------
    // TEST 2 – PURCHASE (Tăng tồn kho)
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 2 – PURCHASE ---');
    const prodT2 = ensureTestProduct('prod_test_p6_02', 'P6_T02', 'Áo Sơ Mi Test Purchase', 10);
    const purchaseRes = await fetch(`${baseUrl}/purchases`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        partnerId: 'p3', // Garment Vina
        items: [{ productId: prodT2, quantity: 5, unitPrice: 100000 }],
        paidAmount: 500000,
        note: 'Test Phase 6 Purchase tăng tồn'
      })
    });
    const purchaseData = await purchaseRes.json() as any;
    const prodT2After = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT2) as any;
    assert(
      purchaseRes.ok && purchaseData.success && prodT2After.current_stock === 15,
      'TEST 2 – PURCHASE',
      `Tồn: 10, Nhập: 5, Kết quả: ${prodT2After.current_stock} (Expected: 15)`
    );

    // --------------------------------------------------------------------------
    // TEST 3 – SALE (Giảm tồn kho)
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 3 – SALE ---');
    const prodT3 = ensureTestProduct('prod_test_p6_03', 'P6_T03', 'Áo Sơ Mi Test Sale', 15);
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        partnerId: 'p1', // Khách hàng KH001
        items: [{ productId: prodT3, quantity: 4 }],
        paymentMethod: 'CASH',
        note: 'Test Phase 6 Sale giảm tồn'
      })
    });
    const saleData = await saleRes.json() as any;
    const prodT3After = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT3) as any;
    assert(
      saleRes.ok && saleData.success && prodT3After.current_stock === 11,
      'TEST 3 – SALE',
      `Tồn: 15, Bán: 4, Kết quả: ${prodT3After.current_stock} (Expected: 11)`
    );

    // --------------------------------------------------------------------------
    // TEST 4 – SALE OVER STOCK (Không cho bán vượt tồn kho)
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 4 – SALE OVER STOCK ---');
    const prodT4 = ensureTestProduct('prod_test_p6_04', 'P6_T04', 'Áo Sơ Mi Test Over Stock', 5);
    const overSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        partnerId: 'p1',
        items: [{ productId: prodT4, quantity: 6 }],
        paymentMethod: 'CASH'
      })
    });
    const prodT4After = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT4) as any;
    assert(
      overSaleRes.status === 400 && prodT4After.current_stock === 5,
      'TEST 4 – SALE OVER STOCK',
      `Tồn: 5, Bán: 6 -> REJECT (status 400), Stock vẫn: ${prodT4After.current_stock}`
    );

    // --------------------------------------------------------------------------
    // TEST 5 – MULTI PRODUCT SALE
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 5 – MULTI PRODUCT SALE ---');
    const prodT5A = ensureTestProduct('prod_test_p6_05a', 'P6_T05A', 'Sản phẩm Đa mặt hàng A', 10);
    const prodT5B = ensureTestProduct('prod_test_p6_05b', 'P6_T05B', 'Sản phẩm Đa mặt hàng B', 20);
    const multiSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        partnerId: 'p1',
        items: [
          { productId: prodT5A, quantity: 2 },
          { productId: prodT5B, quantity: 5 }
        ],
        paymentMethod: 'CASH'
      })
    });
    const prodT5AAfter = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT5A) as any;
    const prodT5BAfter = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT5B) as any;
    assert(
      multiSaleRes.ok && prodT5AAfter.current_stock === 8 && prodT5BAfter.current_stock === 15,
      'TEST 5 – MULTI PRODUCT SALE',
      `SP A: 10 -> 8 (kết quả: ${prodT5AAfter.current_stock}), SP B: 20 -> 15 (kết quả: ${prodT5BAfter.current_stock})`
    );

    // --------------------------------------------------------------------------
    // TEST 6 – MULTI PRODUCT ROLLBACK
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 6 – MULTI PRODUCT ROLLBACK ---');
    const prodT6A = ensureTestProduct('prod_test_p6_06a', 'P6_T06A', 'Sản phẩm Rollback A', 10);
    const prodT6B = ensureTestProduct('prod_test_p6_06b', 'P6_T06B', 'Sản phẩm Rollback B', 2);
    const rollbackSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        partnerId: 'p1',
        items: [
          { productId: prodT6A, quantity: 3 },
          { productId: prodT6B, quantity: 5 } // Chỉ có 2 -> Thất bại!
        ],
        paymentMethod: 'CASH'
      })
    });
    const prodT6AAfter = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT6A) as any;
    const prodT6BAfter = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT6B) as any;
    assert(
      rollbackSaleRes.status === 400 && prodT6AAfter.current_stock === 10 && prodT6BAfter.current_stock === 2,
      'TEST 6 – MULTI PRODUCT ROLLBACK',
      `Bán A: 3, B: 5 khi B chỉ có 2 -> REJECT toàn bộ. A vẫn ${prodT6AAfter.current_stock}, B vẫn ${prodT6BAfter.current_stock}`
    );

    // --------------------------------------------------------------------------
    // TEST 7 – ADJUSTMENT
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 7 – ADJUSTMENT ---');
    const prodT7 = ensureTestProduct('prod_test_p6_07', 'P6_T07', 'Sản phẩm Điều Chỉnh Tồn', 10);
    const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        productId: prodT7,
        delta: -2,
        reason: 'Hàng lỗi đường chỉ may'
      })
    });
    const adjustData = await adjustRes.json() as any;
    const prodT7After = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT7) as any;
    const lastLog = db.prepare("SELECT note FROM inventory_logs WHERE note LIKE '%Hàng lỗi đường chỉ may%'").get() as any;
    assert(
      adjustRes.ok && adjustData.success && prodT7After.current_stock === 8 && !!lastLog,
      'TEST 7 – ADJUSTMENT',
      `Stock: 10, Adjustment: -2 -> Kết quả: ${prodT7After.current_stock}, Có inventory log: ${Boolean(lastLog)}`
    );

    // --------------------------------------------------------------------------
    // TEST 8 – ADJUSTMENT BELOW ZERO
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 8 – ADJUSTMENT BELOW ZERO ---');
    const prodT8 = ensureTestProduct('prod_test_p6_08', 'P6_T08', 'Sản phẩm Chống Âm Điều Chỉnh', 3);
    const negAdjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        productId: prodT8,
        delta: -5,
        reason: 'Xuất bù kho'
      })
    });
    const prodT8After = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT8) as any;
    assert(
      negAdjustRes.status === 400 && prodT8After.current_stock === 3,
      'TEST 8 – ADJUSTMENT BELOW ZERO',
      `Stock: 3, Adjustment: -5 -> REJECT (status 400), Stock vẫn: ${prodT8After.current_stock}`
    );

    // --------------------------------------------------------------------------
    // TEST 9 – SEARCH
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 9 – SEARCH ---');
    const searchRes = await fetch(`${baseUrl}/inventory?search=${encodeURIComponent('Áo khoác')}`, {
      headers: directorHeaders
    });
    const searchItems = await searchRes.json() as any[];
    const allMatchSearch = Array.isArray(searchItems) && searchItems.length > 0 && searchItems.every(
      item => (item.name + item.code + (item.category || '')).toLowerCase().includes('áo khoác')
    );
    assert(
      allMatchSearch,
      'TEST 9 – SEARCH',
      `Tìm kiếm 'Áo khoác' trả về ${searchItems?.length} sản phẩm phù hợp`
    );

    // --------------------------------------------------------------------------
    // TEST 10 – CATEGORY FILTER
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 10 – CATEGORY FILTER ---');
    const catRes = await fetch(`${baseUrl}/inventory?category=${encodeURIComponent('Áo thun')}`, {
      headers: directorHeaders
    });
    const catItems = await catRes.json() as any[];
    const allMatchCategory = Array.isArray(catItems) && catItems.length > 0 && catItems.every(
      item => item.category === 'Áo thun' || item.categoryId === 'cat_aothun'
    );
    assert(
      allMatchCategory,
      'TEST 10 – CATEGORY FILTER',
      `Lọc danh mục 'Áo thun' trả về ${catItems?.length} sản phẩm thuộc nhóm Áo thun`
    );

    // --------------------------------------------------------------------------
    // TEST 11 – DATABASE PERSISTENCE
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 11 – DATABASE PERSISTENCE ---');
    const prodT11 = ensureTestProduct('prod_test_p6_11', 'P6_T11', 'Sản phẩm Test Persistence', 10);
    await fetch(`${baseUrl}/inventory/adjust`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        productId: prodT11,
        delta: 7,
        reason: 'Kiểm kê dư bù hàng'
      })
    });
    // Truy vấn trực tiếp từ SQLite
    const freshDbCheck = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT11) as any;
    const apiDbCheckRes = await fetch(`${baseUrl}/inventory/${prodT11}`, { headers: directorHeaders });
    const apiDbCheckData = await apiDbCheckRes.json() as any;
    assert(
      freshDbCheck.current_stock === 17 && apiDbCheckData.product.currentStock === 17,
      'TEST 11 – DATABASE PERSISTENCE',
      `Tồn kho lưu bền vững trong SQLite: DB=${freshDbCheck.current_stock}, API=${apiDbCheckData.product?.currentStock} (Expected: 17)`
    );

    // --------------------------------------------------------------------------
    // TEST 12 – PURCHASE + SALE (10 + 5 - 3 = 12)
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 12 – PURCHASE + SALE ---');
    const prodT12 = ensureTestProduct('prod_test_p6_12', 'P6_T12', 'Sản phẩm Test Purchase & Sale', 10);

    // 1. Purchase 5
    await fetch(`${baseUrl}/purchases`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        partnerId: 'p3',
        items: [{ productId: prodT12, quantity: 5, unitPrice: 100000 }]
      })
    });

    // 2. Sale 3
    await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: directorHeaders,
      body: JSON.stringify({
        partnerId: 'p1',
        items: [{ productId: prodT12, quantity: 3 }],
        paymentMethod: 'CASH'
      })
    });

    const prodT12After = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodT12) as any;
    assert(
      prodT12After.current_stock === 12,
      'TEST 12 – PURCHASE + SALE',
      `Initial: 10 + Purchase: 5 - Sale: 3 = ${prodT12After.current_stock} (Expected: 12)`
    );

    // --------------------------------------------------------------------------
    // TEST 13 – RBAC (Không có quyền ADJUST_INVENTORY -> 403 Forbidden)
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 13 – RBAC ---');
    const rbacRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: 'POST',
      headers: salesStaffHeaders, // SALES_STAFF
      body: JSON.stringify({
        productId: prodT1,
        delta: 1,
        reason: 'Nhân viên bán hàng thử điều chỉnh kho trái quyền'
      })
    });
    assert(
      rbacRes.status === 403,
      'TEST 13 – RBAC',
      `User SALES_STAFF gọi POST /api/inventory/adjust trả về ${rbacRes.status} Forbidden`
    );

    // --------------------------------------------------------------------------
    // TEST 14 – LINT
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 14 – LINT ---');
    let lintPassed = false;
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      lintPassed = true;
    } catch (err: any) {
      lintPassed = false;
    }
    assert(lintPassed, 'TEST 14 – LINT', 'npm run lint PASS');

    // --------------------------------------------------------------------------
    // TEST 15 – BUILD
    // --------------------------------------------------------------------------
    console.log('\n--- TEST 15 – BUILD ---');
    let buildPassed = false;
    try {
      execSync('npm run build', { stdio: 'pipe' });
      buildPassed = true;
    } catch (err: any) {
      buildPassed = false;
    }
    assert(buildPassed, 'TEST 15 – BUILD', 'npm run build PASS');

  } finally {
    server.close();
  }

  // --------------------------------------------------------------------------
  // TỔNG KẾT
  // --------------------------------------------------------------------------
  console.log('\n==================================================');
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log('==================================================\n');

  if (passedCount === totalCount) {
    console.log('🎉 TẤT CẢ 15 TEST CASES CỦA PHASE 6 ĐỀU ĐÃ VƯỢT QUA!');
    process.exit(0);
  } else {
    console.error('❌ CÓ TEST CASE THẤT BẠI!');
    process.exit(1);
  }
}

runInventoryTests().catch((err) => {
  console.error('Lỗi khi thực thi test suite:', err);
  process.exit(1);
});

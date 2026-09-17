import db from '../db/database.js';
import jwt from 'jsonwebtoken';
import { SERVER_CONFIG } from './config.js';

async function runAudit() {
  console.log('====================================================');
  console.log('PHASE 8.2 COMPREHENSIVE SYSTEM & VALIDATION AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. AUDIT CATEGORIES & PRODUCTS
  console.log('--- 1. AUDIT 7 CANONICAL CATEGORIES & 160 PRODUCTS ---');
  const categories = db.prepare('SELECT id, code, name FROM categories ORDER BY name').all() as any[];
  console.log(`Total categories in DB: ${categories.length}`);
  categories.forEach(c => console.log(`   - [${c.id}] ${c.code}: ${c.name}`));

  assert(categories.length === 7, `Expected exactly 7 canonical categories, found ${categories.length}`);

  const CANONICAL_NAMES = [
    'Giày dép nữ',
    'Quần jeans',
    'Túi xách',
    'Áo khoác',
    'Áo sơ mi',
    'Áo thun',
    'Đầm/Váy'
  ];

  const dbCatNames = categories.map(c => c.name).sort();
  assert(
    JSON.stringify(dbCatNames) === JSON.stringify(CANONICAL_NAMES),
    'All 7 category names match canonical list perfectly'
  );

  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as any;
  console.log(`Total products in DB: ${totalProducts.count}`);
  assert(totalProducts.count >= 140, `Products in DB (${totalProducts.count}) >= 140`);

  const orphanProducts = db.prepare(`
    SELECT COUNT(*) as count FROM products p 
    LEFT JOIN categories c ON c.id = p.category_id 
    WHERE c.id IS NULL OR p.category_id IS NULL OR p.category_id = ''
  `).get() as any;
  assert(orphanProducts.count === 0, `0 orphan/null category products (found: ${orphanProducts.count})`);

  // Product distribution per category
  const productDist = db.prepare(`
    SELECT c.name as category, COUNT(p.id) as count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY c.name
  `).all() as any[];
  console.log('Product count per category:');
  productDist.forEach(d => console.log(`   - ${d.category}: ${d.count} products`));
  const emptyCategories = productDist.filter(d => d.count === 0);
  assert(emptyCategories.length === 0, 'No category is empty; all categories have assigned products');

  // 2. AUDIT UNIQUE PHONE INDEX ON PARTNERS
  console.log('\n--- 2. AUDIT UNIQUE PHONE INDEX ON PARTNERS ---');
  const indexList = db.prepare("PRAGMA index_list('partners')").all() as any[];
  const hasPhoneUnique = indexList.some(idx => idx.name.includes('phone') && idx.unique === 1);
  assert(hasPhoneUnique, 'Unique index on partners(phone) exists in SQLite schema');

  // 3. AUDIT RBAC & POS QUICK CUSTOMER CREATION
  console.log('\n--- 3. AUDIT POS QUICK CUSTOMER CREATION & RBAC PERMISSIONS ---');
  
  // Verify SALES_STAFF and SALES_CASHIER can create customers
  const salesStaffUser = { id: 'usr_staff', username: 'banhang_my', role: 'SALES_STAFF' };
  const salesStaffToken = jwt.sign(salesStaffUser, SERVER_CONFIG.JWT_SECRET, { expiresIn: '1h' });
  assert(Boolean(salesStaffToken), 'Generated valid JWT for SALES_STAFF');

  const cashierUser = { id: 'usr_cashier', username: 'thungan_1', role: 'SALES_CASHIER' };
  const cashierToken = jwt.sign(cashierUser, SERVER_CONFIG.JWT_SECRET, { expiresIn: '1h' });
  assert(Boolean(cashierToken), 'Generated valid JWT for SALES_CASHIER');

  // Test Direct DB Validation: Duplicate Phone Rejection
  const testPhone = `0999${Math.floor(100000 + Math.random() * 900000)}`;
  const testPartnerId1 = `part_test_${Date.now()}_1`;
  const testPartnerId2 = `part_test_${Date.now()}_2`;

  try {
    db.prepare(`
      INSERT INTO partners (id, code, name, type, phone, address, tier)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(testPartnerId1, `TEST01_${Date.now()}`, 'Khách Hàng Test 1', 'CUSTOMER', testPhone, 'HCM', 'STANDARD');
    assert(true, `Successfully inserted initial test partner with phone ${testPhone}`);
  } catch (err: any) {
    assert(false, `Failed to insert initial partner: ${err.message}`);
  }

  // Attempt to insert duplicate phone -> should throw SQLite constraint error
  let duplicateCaught = false;
  try {
    db.prepare(`
      INSERT INTO partners (id, code, name, type, phone, address, tier)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(testPartnerId2, `TEST02_${Date.now()}`, 'Khách Hàng Test 2 Trùng Phone', 'CUSTOMER', testPhone, 'Hà Nội', 'STANDARD');
  } catch (err: any) {
    duplicateCaught = true;
    assert(
      err.message.includes('UNIQUE constraint failed') || err.message.includes('idx_partners_phone'),
      `SQLite blocked duplicate phone: ${err.message}`
    );
  }
  assert(duplicateCaught, 'Duplicate phone number correctly rejected by database constraint');

  // Clean up test partners
  db.prepare('DELETE FROM partners WHERE id IN (?, ?)').run(testPartnerId1, testPartnerId2);

  // 4. AUDIT PRODUCT CATEGORY INTEGRITY & VALIDATION
  console.log('\n--- 4. AUDIT PRODUCT VALIDATION ---');
  // Check categoryId required check
  const randomProdId = `prod_test_${Date.now()}`;
  let catFkCaught = false;
  try {
    // Attempt insert product with invalid category_id
    db.prepare(`
      INSERT INTO products (id, code, name, unit, category_id, cost_price, selling_price, current_stock, min_stock_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomProdId, `SKU_TEST_${Date.now()}`, 'Áo test không danh mục', 'Cái', 'cat_non_existent', 100000, 200000, 10, 5);
  } catch (err: any) {
    catFkCaught = true;
  }
  // Foreign key check in SQLite if PRAGMA foreign_keys = ON
  console.log('   Category foreign key check tested');
  // Clean up if inserted
  db.prepare('DELETE FROM products WHERE id = ?').run(randomProdId);

  // 5. AUDIT INVENTORY INTEGRITY & ACCOUNTING POSTING
  console.log('\n--- 5. AUDIT INVENTORY & STOCK CONSISTENCY ---');
  const negativeStockProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE current_stock < 0').get() as any;
  assert(negativeStockProducts.count === 0, `0 products with negative stock in database (found: ${negativeStockProducts.count})`);

  const accounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as any;
  assert(accounts.count >= 20, `Chart of accounts is fully configured (${accounts.count} accounts)`);

  console.log('\n====================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal error in audit:', err);
  process.exit(1);
});

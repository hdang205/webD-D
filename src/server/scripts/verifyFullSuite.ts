import db from '../../db/database.js';
import { seedHaDongSupplierTransaction } from './seedHaDongSupplier.js';

async function main() {
  console.log('=== VERIFYING D&D EXTENSIONS & INTEGRITY ===');

  // 1. Verify Supplier Ha Dong
  const supplierSeedResult = seedHaDongSupplierTransaction();
  console.log('Supplier seed result:', supplierSeedResult.partner.code, supplierSeedResult.partner.name);

  const supplier = db.prepare("SELECT * FROM partners WHERE code = 'NCC002'").get() as any;
  if (!supplier) throw new Error('Supplier NCC002 not found');
  console.log('✓ Supplier NCC002 verified:', supplier.name, supplier.phone, supplier.address);

  // Check Ha Dong purchase invoice
  const invoice = db.prepare("SELECT * FROM invoices WHERE code = 'HDM-HADONG-01'").get() as any;
  if (!invoice) throw new Error('Invoice HDM-HADONG-01 not found');
  console.log('✓ Invoice HDM-HADONG-01 verified. Grand total:', invoice.grand_total, 'Paid:', invoice.paid_amount, 'Status:', invoice.status);

  const invoiceItems = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(invoice.id) as any[];
  console.log(`✓ Invoice items count: ${invoiceItems.length}`);
  invoiceItems.forEach(item => {
    console.log(`  - Product ${item.product_id}: Qty ${item.quantity}, Price ${item.unit_price}, Amount ${item.total_amount}`);
  });

  // 2. Test Stock Audit Logic
  console.log('\n--- TESTING STOCK AUDIT LOGIC ---');
  const products = db.prepare("SELECT id, code, name, unit, current_stock, cost_price FROM products LIMIT 3").all() as any[];
  console.log('Sample products before audit:');
  products.forEach(p => console.log(`  [${p.code}] ${p.name} - Stock: ${p.current_stock}`));

  const p1 = products[0];
  const p2 = products[1];
  const p3 = products[2];

  const auditId = 'audit_verify_' + Date.now();
  const auditCode = 'PKK-VERIFY-' + Date.now().toString().slice(-4);
  const auditDate = new Date().toISOString().split('T')[0];

  const auditItems = [
    {
      product: p1,
      systemStock: p1.current_stock,
      actualStock: p1.current_stock, // Khớp
      difference: 0,
      status: 'MATCH',
      costPrice: p1.cost_price,
      differenceValue: 0,
      note: 'Khớp thực tế'
    },
    {
      product: p2,
      systemStock: p2.current_stock,
      actualStock: Math.max(0, p2.current_stock - 2), // Thiếu 2
      difference: Math.max(0, p2.current_stock - 2) - p2.current_stock,
      status: (Math.max(0, p2.current_stock - 2) - p2.current_stock) < 0 ? 'SHORTAGE' : 'MATCH',
      costPrice: p2.cost_price,
      differenceValue: Math.abs(Math.max(0, p2.current_stock - 2) - p2.current_stock) * p2.cost_price,
      note: 'Hàng thiếu kiểm đếm'
    },
    {
      product: p3,
      systemStock: p3.current_stock,
      actualStock: p3.current_stock + 3, // Thừa 3
      difference: 3,
      status: 'SURPLUS',
      costPrice: p3.cost_price,
      differenceValue: 3 * p3.cost_price,
      note: 'Hàng thừa thực tế'
    }
  ];

  const matchedCount = auditItems.filter(i => i.status === 'MATCH').length;
  const shortageCount = auditItems.filter(i => i.status === 'SHORTAGE').length;
  const surplusCount = auditItems.filter(i => i.status === 'SURPLUS').length;
  const totalDiff = auditItems.reduce((acc, i) => acc + Math.abs(i.difference), 0);

  // Insert audit record into DB
  db.prepare(`
    INSERT INTO stock_audits (
      id, code, date, auditor_name, auditor_id, reason,
      status, total_items, total_diff, matched_count, shortage_count, surplus_count,
      note, created_at
    ) VALUES (
      @id, @code, @date, @auditorName, @auditorId, @reason,
      'COMPLETED', @totalItems, @totalDiff, @matchedCount, @shortageCount, @surplusCount,
      @note, datetime('now')
    )
  `).run({
    id: auditId,
    code: auditCode,
    date: auditDate,
    auditorName: 'Lê Thị Duyên (Giám Đốc)',
    auditorId: 'usr_emp_1',
    reason: 'Kiểm kê định kỳ tháng 9',
    totalItems: auditItems.length,
    totalDiff,
    matchedCount,
    shortageCount,
    surplusCount,
    note: 'Đã cân bằng tồn kho thực tế'
  });

  const insertAuditItemStmt = db.prepare(`
    INSERT INTO stock_audit_items (
      id, audit_id, product_id, item_code, item_name, unit,
      system_stock, actual_stock, difference, status,
      cost_price, difference_value, note
    ) VALUES (
      @id, @auditId, @productId, @itemCode, @itemName, @unit,
      @systemStock, @actualStock, @difference, @status,
      @costPrice, @differenceValue, @note
    )
  `);

  auditItems.forEach((it, idx) => {
    insertAuditItemStmt.run({
      id: `${auditId}_${idx + 1}`,
      auditId,
      productId: it.product.id,
      itemCode: it.product.code,
      itemName: it.product.name,
      unit: it.product.unit || 'Cái',
      systemStock: it.systemStock,
      actualStock: it.actualStock,
      difference: it.difference,
      status: it.status,
      costPrice: it.costPrice,
      differenceValue: it.differenceValue,
      note: it.note
    });
  });

  // Balance inventory via inventory_logs & inventory_log_items (same as inventoryController.ts)
  for (let i = 0; i < auditItems.length; i++) {
    const it = auditItems[i];
    if (it.difference === 0) continue;

    const isSurplus = it.difference > 0;
    const movementType = isSurplus ? 'IMPORT' : 'EXPORT';
    const absQty = Math.abs(it.difference);
    const logId = `log_audit_verify_${Date.now()}_${i + 1}`;
    const logCode = `DC-KK-VERIFY-${Date.now().toString().slice(-4)}-${i + 1}`;
    const oppositeAccountCode = isSurplus ? '331' : '632';

    db.prepare(`
      INSERT INTO inventory_logs (
        id, code, date, type, invoice_ref, warehouse_name,
        stock_account_code, opposite_account_code, total_value,
        note, created_by, created_at
      ) VALUES (
        @id, @code, @date, @type, @invoiceRef, 'Kho Tổng Thời Trang D&D',
        '156', @oppositeAccountCode, @totalValue,
        @note, @createdBy, datetime('now')
      )
    `).run({
      id: logId,
      code: logCode,
      date: auditDate,
      type: movementType,
      invoiceRef: auditCode,
      oppositeAccountCode,
      totalValue: it.differenceValue,
      note: `[KIỂM KHO ${auditCode}] ${isSurplus ? 'Thừa' : 'Thiếu'} hàng ${absQty}`,
      createdBy: 'usr_emp_1'
    });

    db.prepare(`
      INSERT INTO inventory_log_items (
        id, inventory_log_id, product_id, movement_type, item_code,
        item_name, unit, quantity, unit_price, total_amount
      ) VALUES (
        @id, @logId, @productId, @movementType, @itemCode,
        @itemName, @unit, @quantity, @unitPrice, @totalAmount
      )
    `).run({
      id: `item_log_audit_verify_${Date.now()}_${i + 1}`,
      logId,
      productId: it.product.id,
      movementType,
      itemCode: it.product.code,
      itemName: it.product.name,
      unit: it.product.unit || 'Cái',
      quantity: absQty,
      unitPrice: it.costPrice,
      totalAmount: it.differenceValue
    });
  }

  // Verify updated stocks
  const updatedProducts = db.prepare("SELECT id, code, name, current_stock FROM products WHERE id IN (?, ?, ?)").all(p1.id, p2.id, p3.id) as any[];
  console.log('Sample products AFTER audit balancing:');
  updatedProducts.forEach(p => {
    const orig = products.find(x => x.id === p.id);
    console.log(`  [${p.code}] ${p.name} - Stock: ${orig.current_stock} -> ${p.current_stock}`);
    if (p.id === p1.id && p.current_stock !== orig.current_stock) throw new Error('p1 stock should remain unchanged');
    if (p.id === p2.id && p.current_stock !== Math.max(0, orig.current_stock - 2)) throw new Error('p2 stock should match actual stock');
    if (p.id === p3.id && p.current_stock !== orig.current_stock + 3) throw new Error('p3 stock should match actual stock');
  });

  // 3. Test Defective Goods Logic
  console.log('\n--- TESTING DEFECTIVE GOODS ---');
  const defectProduct = updatedProducts[0];
  const defectId = 'defect_verify_' + Date.now();
  const defectCode = 'DEF-VERIFY-' + Date.now().toString().slice(-4);
  const defectQty = 2;
  const defectCost = Number(defectProduct.cost_price) || 200000;

  // Insert defect record into DB
  db.prepare(`
    INSERT INTO defective_goods (
      id, code, product_id, item_code, item_name, unit,
      quantity, reason, action_type, action_title, note,
      handler_name, handler_id, date, cost_price, total_loss,
      status, created_at
    ) VALUES (
      @id, @code, @productId, @itemCode, @itemName, @unit,
      @quantity, @reason, @actionType, @actionTitle, @note,
      @handlerName, @handlerId, @date, @costPrice, @totalLoss,
      'COMPLETED', datetime('now')
    )
  `).run({
    id: defectId,
    code: defectCode,
    productId: defectProduct.id,
    itemCode: defectProduct.code,
    itemName: defectProduct.name,
    unit: 'Cái',
    quantity: defectQty,
    reason: 'Rách mép vải và lỗi đường may gia công',
    actionType: 'RETURN_SUPPLIER',
    actionTitle: 'Trả hàng nhà cung cấp',
    note: 'Đã liên hệ NCC đổi lô mới',
    handlerName: 'Lê Thị Duyên (Giám Đốc)',
    handlerId: 'usr_emp_1',
    date: auditDate,
    costPrice: defectCost,
    totalLoss: defectQty * defectCost
  });

  // Deduct stock via inventory_logs (EXPORT)
  const defectInvLogId = `log_defect_verify_${Date.now()}`;
  db.prepare(`
    INSERT INTO inventory_logs (
      id, code, date, type, invoice_ref, warehouse_name,
      stock_account_code, opposite_account_code, total_value,
      note, created_by, created_at
    ) VALUES (
      @id, @code, @date, 'EXPORT', @invoiceRef, 'Kho Tổng Thời Trang D&D',
      '156', '331', @totalValue,
      @note, @createdBy, datetime('now')
    )
  `).run({
    id: defectInvLogId,
    code: `XK-HL-${Date.now().toString().slice(-4)}`,
    date: auditDate,
    invoiceRef: defectCode,
    totalValue: defectQty * defectCost,
    note: `[HÀNG LỖI] Xuất trả nhà cung cấp theo phiếu #${defectCode}`,
    createdBy: 'usr_emp_1'
  });

  db.prepare(`
    INSERT INTO inventory_log_items (
      id, inventory_log_id, product_id, movement_type, item_code,
      item_name, unit, quantity, unit_price, total_amount
    ) VALUES (
      @id, @logId, @productId, 'EXPORT', @itemCode,
      @itemName, @unit, @quantity, @unitPrice, @totalAmount
    )
  `).run({
    id: `item_log_defect_${Date.now()}`,
    logId: defectInvLogId,
    productId: defectProduct.id,
    itemCode: defectProduct.code,
    itemName: defectProduct.name,
    unit: 'Cái',
    quantity: defectQty,
    unitPrice: defectCost,
    totalAmount: defectQty * defectCost
  });

  const productAfterDefect = db.prepare("SELECT id, code, current_stock FROM products WHERE id = ?").get(defectProduct.id) as any;
  console.log(`✓ Product [${defectProduct.code}] stock after defect write-off (-${defectQty}): ${defectProduct.current_stock} -> ${productAfterDefect.current_stock}`);
  if (productAfterDefect.current_stock !== defectProduct.current_stock - defectQty) {
    throw new Error('Stock not correctly decremented after defect');
  }

  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

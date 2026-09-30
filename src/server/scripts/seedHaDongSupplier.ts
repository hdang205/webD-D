import db from '../../db/database.js';

export function seedHaDongSupplierTransaction() {
  console.log('--- KHỞI TẠO GIAO DỊCH NHÀ CUNG CẤP VẢI LỤA & COTTON HÀ ĐÔNG ---');

  // 1. Kiểm tra Nhà cung cấp đã tồn tại chưa
  let partner = db.prepare(`
    SELECT id, code, name, type, tax_code, phone, address, email, opening_debt_credit
    FROM partners
    WHERE name LIKE '%Hà Đông%' OR code = 'NCC002'
  `).get() as any;

  if (!partner) {
    console.log('Chưa có NCC Hà Đông trong database, tiến hành thêm mới...');
    const partnerId = 'p4';
    const partnerCode = 'NCC002';
    const partnerName = 'Nhà Cung Cấp Vải Lụa & Cotton Hà Đông';

    db.prepare(`
      INSERT INTO partners (
        id, code, name, type, tax_code, phone, address, email,
        bank_account, bank_name, opening_debt_debit, opening_debt_credit,
        created_at
      ) VALUES (
        @id, @code, @name, 'SUPPLIER', '0104432109', '024 3771 9999',
        'Làng Lụa Vạn Phúc, Hà Đông, Hà Nội', 'luahadong@gmail.com',
        '19034567891234', 'Techcombank - CN Hà Đông', 0, 0,
        datetime('now')
      )
    `).run({
      id: partnerId,
      code: partnerCode,
      name: partnerName
    });

    partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId);
    console.log(`Đã tạo nhà cung cấp: ${partner.name} (${partner.code})`);
  } else {
    console.log(`Nhà cung cấp đã tồn tại: ${partner.name} (${partner.code}), ID: ${partner.id}`);
  }

  // 2. Kiểm tra xem NCC này đã có giao dịch chưa
  const existingInvoices = db.prepare(`
    SELECT id, code, grand_total, paid_amount, status, created_at
    FROM invoices
    WHERE partner_id = ? AND type = 'PURCHASE'
  `).all(partner.id) as any[];

  if (existingInvoices.length > 0) {
    console.log(`NCC Hà Đông đã có ${existingInvoices.length} giao dịch nhập hàng trước đó:`, existingInvoices);
    return {
      partner,
      alreadyExisted: true,
      invoices: existingInvoices
    };
  }

  // 3. Lựa chọn các mặt hàng vải lụa & cotton mẫu từ danh mục
  const selectedProducts = [
    { code: 'SP001', qty: 20, unitPrice: 220000, vatRate: 8 }, // Áo Sơ Mi Lụa Silk Premium
    { code: 'SP005', qty: 30, unitPrice: 110000, vatRate: 8 }, // Áo T-Shirt Compact Cotton
    { code: 'SP003', qty: 15, unitPrice: 320000, vatRate: 8 }, // Váy Xòe Floral Summer
  ];

  const validatedItems: any[] = [];
  let subtotal = 0;
  let vatTotal = 0;

  for (const item of selectedProducts) {
    const prod = db.prepare('SELECT id, code, name, unit, cost_price, current_stock FROM products WHERE code = ?').get(item.code) as any;
    if (!prod) {
      throw new Error(`Không tìm thấy sản phẩm ${item.code} trong database`);
    }

    const lineRaw = item.qty * item.unitPrice;
    const lineVat = Math.round((lineRaw * item.vatRate) / 100);
    const lineTotal = lineRaw + lineVat;

    subtotal += lineRaw;
    vatTotal += lineVat;

    validatedItems.push({
      product: prod,
      quantity: item.qty,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      vatAmount: lineVat,
      totalAmount: lineTotal,
      stockBefore: prod.current_stock
    });
  }

  const grandTotal = subtotal + vatTotal;
  const paidAmount = 0; // Chưa trả tiền -> ghi nhận toàn bộ vào Công nợ phải trả TK 331
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const invoiceId = `invc_pur_hadong_${Date.now()}`;
  const invoiceCode = 'HDM-HADONG-01';
  const inventoryLogId = `log_imp_hadong_${Date.now()}`;
  const inventoryLogCode = 'PNK-HADONG-01';

  // 4. Giao dịch Database Atomic
  const executeSeed = db.transaction(() => {
    // 4.1. Tạo Hóa đơn mua hàng (invoices)
    db.prepare(`
      INSERT INTO invoices (
        id, code, invoice_symbol, date, due_date, type, partner_id,
        subtotal, discount_total, vat_total, grand_total, paid_amount,
        status, note, created_by, created_at, updated_at
      ) VALUES (
        @id, @code, 'HD26T', @date, @dueDate, 'PURCHASE', @partnerId,
        @subtotal, 0, @vatTotal, @grandTotal, @paidAmount,
        'UNPAID', 'Nhập lô hàng mẫu vải lụa tơ tằm & compact cotton từ xưởng dệt Hà Đông',
        'usr_emp_1', datetime('now'), datetime('now')
      )
    `).run({
      id: invoiceId,
      code: invoiceCode,
      date: today,
      dueDate,
      partnerId: partner.id,
      subtotal,
      vatTotal,
      grandTotal,
      paidAmount
    });

    // 4.2. Tạo chi tiết hóa đơn (invoice_items)
    const insertItemStmt = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, item_code, item_name, unit,
        quantity, unit_price, discount_rate, discount_amount,
        vat_rate, vat_amount, total_amount
      ) VALUES (
        @id, @invoiceId, @productId, @itemCode, @itemName, @unit,
        @quantity, @unitPrice, 0, 0,
        @vatRate, @vatAmount, @totalAmount
      )
    `);

    validatedItems.forEach((it, idx) => {
      insertItemStmt.run({
        id: `item_hadong_${invoiceId}_${idx + 1}`,
        invoiceId,
        productId: it.product.id,
        itemCode: it.product.code,
        itemName: it.product.name,
        unit: it.product.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate,
        vatAmount: it.vatAmount,
        totalAmount: it.totalAmount
      });
    });

    // 4.3. Tạo Phiếu nhập kho (inventory_logs)
    db.prepare(`
      INSERT INTO inventory_logs (
        id, code, date, type, invoice_ref, invoice_id, partner_id,
        partner_name, deliverer_or_receiver, warehouse_name, stock_account_code, opposite_account_code,
        total_value, note, created_by, created_at
      ) VALUES (
        @id, @code, @date, 'IMPORT', @invoiceRef, @invoiceId, @partnerId,
        @partnerName, 'Nguyễn Văn Lụa - Đại diện Xưởng Hà Đông', 'Kho Tổng Thời Trang D&D',
        '156', '331', @totalValue,
        'Phiếu nhập kho hàng mẫu vải lụa & cotton Hà Đông', 'usr_emp_1', datetime('now')
      )
    `).run({
      id: inventoryLogId,
      code: inventoryLogCode,
      date: today,
      invoiceRef: invoiceCode,
      invoiceId,
      partnerId: partner.id,
      partnerName: partner.name,
      totalValue: grandTotal
    });

    // 4.4. Tạo dòng chi tiết phiếu nhập kho (inventory_log_items)
    // Chú ý: Trigger trg_inventory_log_item_after_insert sẽ tự động cộng tồn kho vào products.current_stock!
    const insertLogItemStmt = db.prepare(`
      INSERT INTO inventory_log_items (
        id, inventory_log_id, product_id, movement_type, item_code,
        item_name, unit, quantity, unit_price, total_amount
      ) VALUES (
        @id, @logId, @productId, 'IMPORT', @itemCode,
        @itemName, @unit, @quantity, @unitPrice, @totalAmount
      )
    `);

    validatedItems.forEach((it, idx) => {
      insertLogItemStmt.run({
        id: `log_item_hadong_${inventoryLogId}_${idx + 1}`,
        logId: inventoryLogId,
        productId: it.product.id,
        itemCode: it.product.code,
        itemName: it.product.name,
        unit: it.product.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalAmount: it.totalAmount
      });
    });
  });

  executeSeed();

  // 5. Kiểm tra kết quả sau khi tạo
  console.log(`✅ Tạo thành công hóa đơn nhập hàng: ${invoiceCode}`);
  console.log(`- Nhà cung cấp: ${partner.name}`);
  console.log(`- Tổng tiền hàng: ${subtotal.toLocaleString('vi-VN')} đ`);
  console.log(`- Thuế VAT: ${vatTotal.toLocaleString('vi-VN')} đ`);
  console.log(`- Tổng thanh toán: ${grandTotal.toLocaleString('vi-VN')} đ`);
  console.log(`- Đã trả: ${paidAmount} đ`);
  console.log(`- Công nợ phải trả (TK 331): ${grandTotal.toLocaleString('vi-VN')} đ`);
  console.log('Biến động tồn kho các mặt hàng:');
  for (const it of validatedItems) {
    const updatedProd = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(it.product.id) as any;
    console.log(`  * ${it.product.code} - ${it.product.name}: Trước = ${it.stockBefore}, Nhập = +${it.quantity}, Sau = ${updatedProd.current_stock} ${it.product.unit}`);
  }

  return {
    success: true,
    invoiceCode,
    grandTotal,
    debt: grandTotal
  };
}

// Chạy tự động khi thực thi file
seedHaDongSupplierTransaction();

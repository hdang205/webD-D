import { Response } from 'express';
import db from '../../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbErrors.js';

interface SaleItemInput {
  productId?: string;
  itemId?: string;
  itemCode?: string;
  quantity: number;
  discountRate?: number;
  vatRate?: number;
}

interface CreateSaleBody {
  code?: string;
  invoiceSymbol?: string;
  date?: string;
  dueDate?: string;
  partnerId?: string;
  items: SaleItemInput[];
  paidAmount?: number;
  customerCash?: number;
  paymentMethod?: 'CASH' | 'BANK' | 'DEBT';
  note?: string;
}

/**
 * Đảm bảo khách lẻ mua tại quầy tồn tại trong bảng partners
 */
export function ensureRetailCustomer(): { id: string; name: string } {
  const existing = db.prepare("SELECT id, name FROM partners WHERE id = 'p_retail' OR code = 'KH_LE'").get() as any;
  if (existing) {
    return existing;
  }
  db.prepare(`
    INSERT INTO partners (
      id, code, name, type, phone, address, 
      opening_debt_debit, opening_debt_credit, notes
    ) VALUES (
      'p_retail', 'KH_LE', 'Khách Lẻ Mua Tại Quầy', 'CUSTOMER', '0900000000', 
      'Showroom D&D Fashion Phố Huế', 0, 0, 'Khách vãng lai mua hàng trực tiếp tại quầy POS'
    )
  `).run();
  return { id: 'p_retail', name: 'Khách Lẻ Mua Tại Quầy' };
}

/**
 * Lấy danh sách toàn bộ hóa đơn bán hàng
 * GET /api/sales
 */
export function getSales(req: AuthenticatedRequest, res: Response): void {
  try {
    const invoices = db.prepare(`
      SELECT 
        i.id,
        i.code,
        i.invoice_symbol as invoiceSymbol,
        i.date,
        i.due_date as dueDate,
        i.type,
        i.partner_id as partnerId,
        p.name as partnerName,
        p.code as partnerCode,
        p.tax_code as partnerTaxCode,
        p.address as partnerAddress,
        p.phone as partnerPhone,
        i.subtotal,
        i.discount_total as discountTotal,
        i.vat_total as vatTotal,
        i.grand_total as grandTotal,
        i.paid_amount as paidAmount,
        (i.grand_total - i.paid_amount) as debtAmount,
        i.status,
        i.note,
        i.created_by as createdBy,
        i.created_at as createdAt,
        i.updated_at as updatedAt
      FROM invoices i
      JOIN partners p ON p.id = i.partner_id
      WHERE i.type = 'SALES'
      ORDER BY i.date DESC, i.created_at DESC
    `).all() as any[];

    // Nạp chi tiết các mặt hàng cho từng hóa đơn
    const getItemsStmt = db.prepare(`
      SELECT 
        ii.id,
        ii.invoice_id as invoiceId,
        ii.product_id as productId,
        ii.product_id as itemId,
        ii.item_code as itemCode,
        ii.item_name as itemName,
        ii.unit,
        ii.quantity,
        ii.unit_price as unitPrice,
        ii.discount_rate as discountRate,
        ii.discount_amount as discountAmount,
        ii.vat_rate as vatRate,
        ii.vat_amount as vatAmount,
        ii.total_amount as totalAmount,
        p.current_stock as currentStock
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `);

    const result = invoices.map(inv => ({
      ...inv,
      items: getItemsStmt.all(inv.id)
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách hóa đơn bán hàng:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi server' });
  }
}

/**
 * Lấy chi tiết một hóa đơn bán hàng
 * GET /api/sales/:id
 */
export function getSaleById(req: AuthenticatedRequest, res: Response): void {
  try {
    const { id } = req.params;
    const inv = db.prepare(`
      SELECT 
        i.id,
        i.code,
        i.invoice_symbol as invoiceSymbol,
        i.date,
        i.due_date as dueDate,
        i.type,
        i.partner_id as partnerId,
        p.name as partnerName,
        p.code as partnerCode,
        p.tax_code as partnerTaxCode,
        p.address as partnerAddress,
        p.phone as partnerPhone,
        i.subtotal,
        i.discount_total as discountTotal,
        i.vat_total as vatTotal,
        i.grand_total as grandTotal,
        i.paid_amount as paidAmount,
        (i.grand_total - i.paid_amount) as debtAmount,
        i.status,
        i.note,
        i.created_by as createdBy,
        i.created_at as createdAt,
        i.updated_at as updatedAt
      FROM invoices i
      JOIN partners p ON p.id = i.partner_id
      WHERE i.id = ? AND i.type = 'SALES'
    `).get(id) as any;

    if (!inv) {
      res.status(404).json({ success: false, error: 'Không tìm thấy hóa đơn bán hàng.' });
      return;
    }

    const items = db.prepare(`
      SELECT 
        ii.id,
        ii.invoice_id as invoiceId,
        ii.product_id as productId,
        ii.product_id as itemId,
        ii.item_code as itemCode,
        ii.item_name as itemName,
        ii.unit,
        ii.quantity,
        ii.unit_price as unitPrice,
        ii.discount_rate as discountRate,
        ii.discount_amount as discountAmount,
        ii.vat_rate as vatRate,
        ii.vat_amount as vatAmount,
        ii.total_amount as totalAmount,
        p.current_stock as currentStock
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `).all(id);

    // Phiếu xuất kho liên quan
    const inventoryLogs = db.prepare(`
      SELECT id, code, date, type, total_value as totalValue, note
      FROM inventory_logs
      WHERE invoice_id = ?
    `).all(id);

    // Giao dịch tiền liên quan
    const cashTransactions = db.prepare(`
      SELECT id, code, date, type, amount, reason, fund_account_code as fundAccountCode
      FROM cash_transactions
      WHERE invoice_id = ?
    `).all(id);

    res.json({
      ...inv,
      items,
      inventoryLogs,
      cashTransactions
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Lỗi server' });
  }
}

/**
 * Sinh mã hóa đơn bán hàng UNIQUE: HD-YYYYMMDD-XXXX
 */
function generateSaleInvoiceCode(dateStr: string): string {
  const dateCompact = dateStr.replace(/-/g, '');
  const prefix = `HD-${dateCompact}-`;

  const rows = db.prepare(`
    SELECT code FROM invoices 
    WHERE code LIKE ? 
    ORDER BY code DESC 
    LIMIT 1
  `).all(`${prefix}%`) as any[];

  let nextSeq = 1;
  if (rows.length > 0 && rows[0].code) {
    const parts = rows[0].code.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  let code = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  // Đảm bảo không trùng lặp tuyệt đối
  while (db.prepare('SELECT id FROM invoices WHERE code = ?').get(code)) {
    nextSeq++;
    code = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
  return code;
}

/**
 * Tạo mới hóa đơn bán hàng (Sales Invoice)
 * POST /api/sales
 */
export function createSale(req: AuthenticatedRequest, res: Response): void {
  try {
    const body: CreateSaleBody = req.body;

    // 1. Xác định & validate khách hàng
    ensureRetailCustomer();

    let partner: any = null;
    const requestedPartnerId = (body.partnerId || '').trim();

    if (!requestedPartnerId || requestedPartnerId === 'p_retail' || requestedPartnerId === 'KH_LE') {
      partner = db.prepare("SELECT id, code, name, address, tax_code FROM partners WHERE id = 'p_retail' OR code = 'KH_LE'").get();
    } else {
      partner = db.prepare('SELECT id, code, name, address, tax_code FROM partners WHERE id = ? OR code = ?').get(requestedPartnerId, requestedPartnerId);
    }

    if (!partner) {
      res.status(400).json({
        success: false,
        error: 'Khách hàng không tồn tại trong hệ thống.'
      });
      return;
    }

    // 2. Validate danh sách sản phẩm
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Hóa đơn bán hàng phải có ít nhất một mặt hàng.'
      });
      return;
    }

    // Gộp sản phẩm trùng lặp theo quy tắc: nếu thêm lại cùng sản phẩm thì cộng dồn số lượng
    const itemMap = new Map<string, {
      productId: string;
      quantity: number;
      discountRate: number;
      vatRate: number;
    }>();

    for (let idx = 0; idx < body.items.length; idx++) {
      const it = body.items[idx];
      const prodIdentifier = (it.productId || it.itemId || it.itemCode || '').trim();

      if (!prodIdentifier) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Vui lòng chọn sản phẩm cần bán.`
        });
        return;
      }

      const qty = Number(it.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Số lượng bán phải là số nguyên lớn hơn 0 (nhận được: ${it.quantity}).`
        });
        return;
      }

      const discountRate = Math.min(100, Math.max(0, Number(it.discountRate) || 0));
      const vatRate = Math.max(0, Number(it.vatRate) || 0);

      // Tra cứu sản phẩm trong DB để lấy product ID chính thức
      const dbProd = db.prepare('SELECT id FROM products WHERE id = ? OR code = ?').get(prodIdentifier, prodIdentifier) as any;
      if (!dbProd) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Sản phẩm '${prodIdentifier}' không tồn tại trong hệ thống.`
        });
        return;
      }

      const canonicalId = dbProd.id;
      if (itemMap.has(canonicalId)) {
        const existing = itemMap.get(canonicalId)!;
        existing.quantity += qty;
      } else {
        itemMap.set(canonicalId, {
          productId: canonicalId,
          quantity: qty,
          discountRate,
          vatRate
        });
      }
    }

    // 3. Kiểm tra tồn kho và lấy giá từ Database cho từng sản phẩm
    const validatedItems: any[] = [];
    let backendSubtotal = 0;
    let backendDiscountTotal = 0;
    let backendVatTotal = 0;
    let totalCostValue = 0;

    for (const [, item] of itemMap.entries()) {
      const product = db.prepare(`
        SELECT id, code, name, unit, cost_price, selling_price, current_stock 
        FROM products 
        WHERE id = ?
      `).get(item.productId) as any;

      if (!product) {
        res.status(400).json({
          success: false,
          error: `Sản phẩm ID '${item.productId}' không tồn tại trong hệ thống.`
        });
        return;
      }

      // KIỂM TRA TỒN KHO BẮT BUỘC: quantity <= current_stock
      if (item.quantity > product.current_stock) {
        res.status(400).json({
          success: false,
          error: `Sản phẩm ${product.name} (mã ${product.code}) chỉ còn ${product.current_stock} sản phẩm, không thể bán ${item.quantity} sản phẩm.`
        });
        return;
      }

      // Đơn giá bán lấy 100% từ Database
      const unitPrice = Number(product.selling_price) || 0;
      const costPrice = Number(product.cost_price) || 0;

      const rawLineTotal = item.quantity * unitPrice;
      const discountAmount = Math.round((rawLineTotal * item.discountRate) / 100);
      const afterDiscount = rawLineTotal - discountAmount;
      const vatAmount = Math.round((afterDiscount * item.vatRate) / 100);
      const lineTotal = afterDiscount + vatAmount;

      backendSubtotal += rawLineTotal;
      backendDiscountTotal += discountAmount;
      backendVatTotal += vatAmount;
      totalCostValue += item.quantity * costPrice;

      validatedItems.push({
        productId: product.id,
        itemCode: product.code,
        itemName: product.name,
        unit: product.unit,
        quantity: item.quantity,
        unitPrice,
        costPrice,
        discountRate: item.discountRate,
        discountAmount,
        vatRate: item.vatRate,
        vatAmount,
        totalAmount: lineTotal,
        currentStock: product.current_stock
      });
    }

    // Backend tự tính tổng tiền (KHÔNG tin total do frontend gửi lên)
    const backendGrandTotal = backendSubtotal - backendDiscountTotal + backendVatTotal;

    // 4. Validate thanh toán & tiền khách đưa
    let paidAmount = 0;
    if (body.paidAmount !== undefined && body.paidAmount !== null && (body.paidAmount as any) !== '') {
      paidAmount = Number(body.paidAmount);
      if (isNaN(paidAmount) || paidAmount < 0) {
        res.status(400).json({
          success: false,
          error: 'Số tiền thanh toán không được là số âm.'
        });
        return;
      }
      if (paidAmount > backendGrandTotal) {
        res.status(400).json({
          success: false,
          error: `Số tiền thanh toán (${paidAmount.toLocaleString('vi-VN')} ₫) không được vượt quá tổng hóa đơn (${backendGrandTotal.toLocaleString('vi-VN')} ₫).`
        });
        return;
      }
    } else {
      // Mặc định: nếu paymentMethod !== 'DEBT' thì coi như thanh toán đủ
      paidAmount = body.paymentMethod === 'DEBT' ? 0 : backendGrandTotal;
    }

    // Kiểm tra tiền thừa nếu frontend gửi customerCash
    let change = 0;
    if (body.customerCash !== undefined && body.customerCash !== null && (body.customerCash as any) !== '') {
      const customerCash = Number(body.customerCash);
      if (isNaN(customerCash) || customerCash < 0) {
        res.status(400).json({
          success: false,
          error: 'Số tiền khách đưa không hợp lệ.'
        });
        return;
      }

      if (paidAmount === backendGrandTotal && customerCash < backendGrandTotal) {
        res.status(400).json({
          success: false,
          error: 'Khách đưa chưa đủ tiền.'
        });
        return;
      }
      change = Math.max(0, customerCash - backendGrandTotal);
    }

    const date = body.date || new Date().toISOString().split('T')[0];
    const dueDate = body.dueDate || date;

    // Sinh mã hóa đơn UNIQUE theo quy chuẩn HD-YYYYMMDD-XXXX
    let invoiceCode = (body.code || '').trim();
    if (!invoiceCode || db.prepare('SELECT id FROM invoices WHERE code = ?').get(invoiceCode)) {
      invoiceCode = generateSaleInvoiceCode(date);
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const invoiceId = `invc_sale_${timestamp}_${randomSuffix}`;
    const inventoryLogId = `log_exp_${timestamp}_${randomSuffix}`;
    const dateCompact = date.replace(/-/g, '');
    const inventoryLogCode = `PXK-${dateCompact}-${randomSuffix.toUpperCase()}`;

    // ========================================================================
    // THỰC THI TOÀN BỘ TRONG ATOMIC TRANSACTION
    // ========================================================================
    const transaction = db.transaction(() => {
      // 1. Tạo hóa đơn bán hàng (invoices)
      db.prepare(`
        INSERT INTO invoices (
          id, code, invoice_symbol, date, due_date, type, partner_id,
          subtotal, discount_total, vat_total, grand_total, paid_amount,
          status, note, created_by, created_at, updated_at
        ) VALUES (
          @id, @code, @invoiceSymbol, @date, @dueDate, 'SALES', @partnerId,
          @subtotal, @discountTotal, @vatTotal, @grandTotal, 0,
          'UNPAID', @note, @createdBy, datetime('now'), datetime('now')
        )
      `).run({
        id: invoiceId,
        code: invoiceCode,
        invoiceSymbol: body.invoiceSymbol || 'HD26T',
        date,
        dueDate,
        partnerId: partner.id,
        subtotal: backendSubtotal,
        discountTotal: backendDiscountTotal,
        vatTotal: backendVatTotal,
        grandTotal: backendGrandTotal,
        note: body.note || 'Bán hàng thời trang Showroom D&D',
        createdBy: req.user?.id || null
      });

      // 2. Tạo chi tiết hóa đơn (invoice_items)
      const insertItemStmt = db.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, product_id, item_code, item_name, unit,
          quantity, unit_price, discount_rate, discount_amount,
          vat_rate, vat_amount, total_amount
        ) VALUES (
          @id, @invoiceId, @productId, @itemCode, @itemName, @unit,
          @quantity, @unitPrice, @discountRate, @discountAmount,
          @vatRate, @vatAmount, @totalAmount
        )
      `);

      for (let i = 0; i < validatedItems.length; i++) {
        const it = validatedItems[i];
        insertItemStmt.run({
          id: `item_${invoiceId}_${i + 1}`,
          invoiceId,
          productId: it.productId,
          itemCode: it.itemCode,
          itemName: it.itemName,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountRate: it.discountRate,
          discountAmount: it.discountAmount,
          vatRate: it.vatRate,
          vatAmount: it.vatAmount,
          totalAmount: it.totalAmount
        });
      }

      // 3. Tạo phiếu xuất kho (inventory_logs)
      db.prepare(`
        INSERT INTO inventory_logs (
          id, code, date, type, invoice_ref, invoice_id, partner_id,
          partner_name, warehouse_name, stock_account_code, opposite_account_code,
          total_value, note, created_by, created_at
        ) VALUES (
          @id, @code, @date, 'EXPORT', @invoiceRef, @invoiceId, @partnerId,
          @partnerName, 'Kho Tổng Thời Trang D&D', '156', '632',
          @totalValue, @note, @createdBy, datetime('now')
        )
      `).run({
        id: inventoryLogId,
        code: inventoryLogCode,
        date,
        invoiceRef: invoiceCode,
        invoiceId,
        partnerId: partner.id,
        partnerName: partner.name,
        totalValue: totalCostValue,
        note: `Bán hàng – ${invoiceCode}`,
        createdBy: req.user?.id || null
      });

      // 4. Tạo chi tiết phiếu xuất kho (inventory_log_items)
      // TRIGGER 'trg_inventory_log_item_after_insert' sẽ kiểm tra tồn kho & TRỪ current_stock
      const insertLogItemStmt = db.prepare(`
        INSERT INTO inventory_log_items (
          id, inventory_log_id, product_id, movement_type, item_code,
          item_name, unit, quantity, unit_price, total_amount
        ) VALUES (
          @id, @logId, @productId, 'EXPORT', @itemCode,
          @itemName, @unit, @quantity, @unitPrice, @totalAmount
        )
      `);

      for (let i = 0; i < validatedItems.length; i++) {
        const it = validatedItems[i];
        insertLogItemStmt.run({
          id: `log_item_${inventoryLogId}_${i + 1}`,
          logId: inventoryLogId,
          productId: it.productId,
          itemCode: it.itemCode,
          itemName: it.itemName,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.costPrice,
          totalAmount: it.quantity * it.costPrice
        });
      }

      // 5. Ghi nhận giao dịch tiền (cash_transactions) nếu có thanh toán (paidAmount > 0)
      if (paidAmount > 0) {
        const cashId = `cash_${timestamp}_${randomSuffix}`;
        const cashCode = `PT-${dateCompact}-${randomSuffix.toUpperCase()}`;
        const isBank = body.paymentMethod === 'BANK';
        const fundAccount = isBank ? '1121' : '1111';
        const transType = isBank ? 'BANK_DEPOSIT' : 'CASH_RECEIPT';

        // TRIGGER 'trg_cash_transaction_after_insert' sẽ tự động cập nhật invoices.paid_amount & invoices.status!
        db.prepare(`
          INSERT INTO cash_transactions (
            id, code, date, type, person_name, reason, amount,
            opposite_account_code, fund_account_code, partner_id,
            invoice_id, invoice_ref, created_by, created_by_name, created_at
          ) VALUES (
            @id, @code, @date, @transType, @personName, @reason, @amount,
            '511', @fundAccount, @partnerId, @invoiceId, @invoiceRef,
            @createdBy, @createdByName, datetime('now')
          )
        `).run({
          id: cashId,
          code: cashCode,
          date,
          transType,
          personName: partner.name,
          reason: `Thu tiền hóa đơn bán hàng ${invoiceCode}`,
          amount: paidAmount,
          fundAccount,
          partnerId: partner.id,
          invoiceId,
          invoiceRef: invoiceCode,
          createdBy: req.user?.id || null,
          createdByName: req.user?.name || 'Thu Ngân Bán Hàng'
        });
      }
    });

    // Thực thi transaction (nếu bất kỳ bước nào lỗi, tự động rollback toàn bộ)
    transaction();

    // Lấy lại hóa đơn và tồn kho thực tế sau transaction
    const createdInvoice = db.prepare(`
      SELECT 
        i.id,
        i.code,
        i.invoice_symbol as invoiceSymbol,
        i.date,
        i.due_date as dueDate,
        i.type,
        i.partner_id as partnerId,
        p.name as partnerName,
        p.code as partnerCode,
        p.tax_code as partnerTaxCode,
        p.address as partnerAddress,
        p.phone as partnerPhone,
        i.subtotal,
        i.discount_total as discountTotal,
        i.vat_total as vatTotal,
        i.grand_total as grandTotal,
        i.paid_amount as paidAmount,
        (i.grand_total - i.paid_amount) as debtAmount,
        i.status,
        i.note
      FROM invoices i
      JOIN partners p ON p.id = i.partner_id
      WHERE i.id = ?
    `).get(invoiceId) as any;

    const items = db.prepare(`
      SELECT 
        ii.id,
        ii.product_id as productId,
        ii.product_id as itemId,
        ii.item_code as itemCode,
        ii.item_name as itemName,
        ii.unit,
        ii.quantity,
        ii.unit_price as unitPrice,
        ii.discount_rate as discountRate,
        ii.discount_amount as discountAmount,
        ii.vat_rate as vatRate,
        ii.vat_amount as vatAmount,
        ii.total_amount as totalAmount,
        p.current_stock as currentStock
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `).all(invoiceId);

    res.status(201).json({
      success: true,
      message: `Tạo hóa đơn bán hàng ${invoiceCode} và xuất kho thành công.`,
      invoice: {
        ...createdInvoice,
        items
      },
      stockUpdates: items.map((it: any) => ({
        productId: it.productId,
        code: it.itemCode,
        soldQuantity: it.quantity,
        remainingStock: it.currentStock
      })),
      change,
      debt: createdInvoice.debtAmount
    });
  } catch (error: any) {
    console.error('Lỗi khi tạo hóa đơn bán hàng:', error);
    handleDbError(res, error);
  }
}

/**
 * Thu thêm tiền cho hóa đơn bán hàng còn nợ
 * POST /api/sales/:id/payments
 */
export function addSalePayment(req: AuthenticatedRequest, res: Response): void {
  try {
    const { id } = req.params;
    const { amount, date, paymentFund, note } = req.body;

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      res.status(400).json({ success: false, error: 'Số tiền thanh toán phải lớn hơn 0.' });
      return;
    }

    const invoice = db.prepare("SELECT * FROM invoices WHERE id = ? AND type = 'SALES'").get(id) as any;
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Không tìm thấy hóa đơn bán hàng.' });
      return;
    }

    const remainingDebt = invoice.grand_total - invoice.paid_amount;
    if (paymentAmount > remainingDebt) {
      res.status(400).json({
        success: false,
        error: `Số tiền thanh toán (${paymentAmount.toLocaleString('vi-VN')} ₫) không được vượt quá số nợ còn lại (${remainingDebt.toLocaleString('vi-VN')} ₫).`
      });
      return;
    }

    const partner = db.prepare('SELECT name FROM partners WHERE id = ?').get(invoice.partner_id) as any;
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const cashId = `cash_${timestamp}_${randomSuffix}`;
    const dateStr = date || new Date().toISOString().split('T')[0];
    const dateCompact = dateStr.replace(/-/g, '');
    const cashCode = `PT-${dateCompact}-${randomSuffix.toUpperCase()}`;
    const isBank = paymentFund === '1121' || paymentFund === '112';
    const fundAccount = isBank ? '1121' : '1111';
    const transType = isBank ? 'BANK_DEPOSIT' : 'CASH_RECEIPT';

    // Trigger sẽ tự cập nhật invoices.paid_amount & status
    db.prepare(`
      INSERT INTO cash_transactions (
        id, code, date, type, person_name, reason, amount,
        opposite_account_code, fund_account_code, partner_id,
        invoice_id, invoice_ref, created_by, created_by_name, created_at
      ) VALUES (
        @id, @code, @date, @transType, @personName, @reason, @amount,
        '511', @fundAccount, @partnerId, @invoiceId, @invoiceRef,
        @createdBy, @createdByName, datetime('now')
      )
    `).run({
      id: cashId,
      code: cashCode,
      date: dateStr,
      transType,
      personName: partner?.name || 'Khách Hàng',
      reason: note || `Thu tiền tiếp cho hóa đơn bán ${invoice.code}`,
      amount: paymentAmount,
      fundAccount,
      partnerId: invoice.partner_id,
      invoiceId: invoice.id,
      invoiceRef: invoice.code,
      createdBy: req.user?.id || null,
      createdByName: req.user?.name || 'Thu Ngân Bán Hàng'
    });

    const updatedInvoice = db.prepare(`
      SELECT 
        i.*,
        (i.grand_total - i.paid_amount) as debtAmount
      FROM invoices i 
      WHERE i.id = ?
    `).get(id) as any;

    res.json({
      success: true,
      message: 'Thu tiền hóa đơn thành công.',
      invoice: updatedInvoice
    });
  } catch (error: any) {
    handleDbError(res, error);
  }
}

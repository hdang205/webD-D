import { Response } from 'express';
import db from '../../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbErrors.js';

interface PurchaseItemInput {
  productId?: string;
  itemId?: string;
  itemCode?: string;
  quantity: number;
  unitPrice: number;
  discountRate?: number;
  vatRate?: number;
}

interface CreatePurchaseBody {
  code?: string;
  invoiceSymbol?: string;
  date?: string;
  dueDate?: string;
  partnerId: string;
  items: PurchaseItemInput[];
  paidAmount?: number;
  paymentFund?: string; // '1111' (Tiền mặt) hoặc '1121' (Ngân hàng)
  note?: string;
}

/**
 * Lấy danh sách toàn bộ hóa đơn mua hàng & nhập kho
 * GET /api/purchases
 */
export function getPurchases(req: AuthenticatedRequest, res: Response): void {
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
        i.status,
        i.note,
        i.created_at as createdAt,
        i.updated_at as updatedAt
      FROM invoices i
      JOIN partners p ON p.id = i.partner_id
      WHERE i.type = 'PURCHASE'
      ORDER BY i.date DESC, i.created_at DESC
    `).all() as any[];

    // Nạp chi tiết các mặt hàng cho từng hóa đơn
    const getItemsStmt = db.prepare(`
      SELECT 
        id,
        invoice_id as invoiceId,
        product_id as productId,
        product_id as itemId,
        item_code as itemCode,
        item_name as itemName,
        unit,
        quantity,
        unit_price as unitPrice,
        discount_rate as discountRate,
        discount_amount as discountAmount,
        vat_rate as vatRate,
        vat_amount as vatAmount,
        total_amount as totalAmount
      FROM invoice_items
      WHERE invoice_id = ?
    `);

    const result = invoices.map(inv => ({
      ...inv,
      items: getItemsStmt.all(inv.id)
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách đơn mua hàng:', error);
    res.status(500).json({ success: false, error: error.message || 'Lỗi server' });
  }
}

/**
 * Lấy chi tiết một hóa đơn mua hàng
 * GET /api/purchases/:id
 */
export function getPurchaseById(req: AuthenticatedRequest, res: Response): void {
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
        i.status,
        i.note,
        i.created_at as createdAt,
        i.updated_at as updatedAt
      FROM invoices i
      JOIN partners p ON p.id = i.partner_id
      WHERE i.id = ? AND i.type = 'PURCHASE'
    `).get(id) as any;

    if (!inv) {
      res.status(404).json({ success: false, error: 'Không tìm thấy hóa đơn mua hàng.' });
      return;
    }

    const items = db.prepare(`
      SELECT 
        id,
        invoice_id as invoiceId,
        product_id as productId,
        product_id as itemId,
        item_code as itemCode,
        item_name as itemName,
        unit,
        quantity,
        unit_price as unitPrice,
        discount_rate as discountRate,
        discount_amount as discountAmount,
        vat_rate as vatRate,
        vat_amount as vatAmount,
        total_amount as totalAmount
      FROM invoice_items
      WHERE invoice_id = ?
    `).all(id);

    res.json({ ...inv, items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Lỗi server' });
  }
}

/**
 * Tạo mới hóa đơn nhập hàng từ xưởng may / nhà cung cấp
 * POST /api/purchases
 */
export function createPurchase(req: AuthenticatedRequest, res: Response): void {
  try {
    const body: CreatePurchaseBody = req.body;

    // 1. Validate nhà cung cấp
    if (!body.partnerId) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng chọn nhà cung cấp / xưởng may.'
      });
      return;
    }

    const partner = db.prepare('SELECT id, code, name, address, tax_code FROM partners WHERE id = ?').get(body.partnerId) as any;
    if (!partner) {
      res.status(400).json({
        success: false,
        error: 'Nhà cung cấp không tồn tại trong hệ thống.'
      });
      return;
    }

    // 2. Validate danh sách sản phẩm
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Đơn nhập hàng phải có ít nhất một mặt hàng.'
      });
      return;
    }

    const validatedItems: any[] = [];
    let backendSubtotal = 0;
    let backendDiscountTotal = 0;
    let backendVatTotal = 0;

    for (let idx = 0; idx < body.items.length; idx++) {
      const item = body.items[idx];
      const prodId = item.productId || item.itemId;
      const codeOrId = prodId || item.itemCode;

      if (!codeOrId) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Vui lòng chọn sản phẩm cần nhập.`
        });
        return;
      }

      // Tìm sản phẩm theo id hoặc code
      const product = db.prepare('SELECT id, code, name, unit, cost_price, current_stock FROM products WHERE id = ? OR code = ?').get(codeOrId, codeOrId) as any;
      if (!product) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Sản phẩm '${codeOrId}' không tồn tại trong hệ thống.`
        });
        return;
      }

      // 3. Validate số lượng (> 0)
      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Số lượng nhập phải lớn hơn 0 (nhận được: ${item.quantity}).`
        });
        return;
      }

      // 4. Validate đơn giá (>= 0)
      const unitPrice = Number(item.unitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Đơn giá nhập không được là số âm (nhận được: ${item.unitPrice}).`
        });
        return;
      }

      // 5. Backend tự động tính toán thành tiền (Không tin frontend)
      const discountRate = Math.min(100, Math.max(0, Number(item.discountRate) || 0));
      const vatRate = Math.max(0, Number(item.vatRate) || 0);

      const rawLineTotal = quantity * unitPrice;
      const discountAmount = Math.round((rawLineTotal * discountRate) / 100);
      const afterDiscount = rawLineTotal - discountAmount;
      const vatAmount = Math.round((afterDiscount * vatRate) / 100);
      const lineTotal = afterDiscount + vatAmount;

      backendSubtotal += rawLineTotal;
      backendDiscountTotal += discountAmount;
      backendVatTotal += vatAmount;

      validatedItems.push({
        productId: product.id,
        itemCode: product.code,
        itemName: product.name,
        unit: product.unit,
        quantity,
        unitPrice,
        discountRate,
        discountAmount,
        vatRate,
        vatAmount,
        totalAmount: lineTotal,
        oldStock: product.current_stock
      });
    }

    const backendGrandTotal = backendSubtotal - backendDiscountTotal + backendVatTotal;
    const paidAmount = Math.max(0, Number(body.paidAmount) || 0);
    const date = body.date || new Date().toISOString().split('T')[0];
    const dueDate = body.dueDate || date;

    // Sinh mã hóa đơn mua nếu chưa có
    let invoiceCode = (body.code || '').trim();
    if (!invoiceCode) {
      const lastCodeRow = db.prepare("SELECT code FROM invoices WHERE type = 'PURCHASE' ORDER BY created_at DESC LIMIT 1").get() as any;
      let nextNum = 1;
      if (lastCodeRow && lastCodeRow.code) {
        const match = lastCodeRow.code.match(/\d+/);
        if (match) nextNum = parseInt(match[0], 10) + 1;
      }
      invoiceCode = `HDM${String(nextNum).padStart(4, '0')}`;
    }

    // Kiểm tra trùng mã hóa đơn
    const existingInv = db.prepare('SELECT id FROM invoices WHERE code = ?').get(invoiceCode);
    if (existingInv) {
      invoiceCode = `HDM${Date.now().toString().slice(-6)}`;
    }

    const invoiceId = `invc_pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inventoryLogId = `log_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inventoryLogCode = `PNK${Date.now().toString().slice(-6)}`;

    // ========================================================================
    // THỰC THI TRANSACTION ATOMIC
    // ========================================================================
    const transaction = db.transaction(() => {
      // 1. Tạo bản ghi Hóa đơn mua hàng (invoices)
      db.prepare(`
        INSERT INTO invoices (
          id, code, invoice_symbol, date, due_date, type, partner_id,
          subtotal, discount_total, vat_total, grand_total, paid_amount,
          status, note, created_by, created_at, updated_at
        ) VALUES (
          @id, @code, @invoiceSymbol, @date, @dueDate, 'PURCHASE', @partnerId,
          @subtotal, @discountTotal, @vatTotal, @grandTotal, 0,
          'UNPAID', @note, @createdBy, datetime('now'), datetime('now')
        )
      `).run({
        id: invoiceId,
        code: invoiceCode,
        invoiceSymbol: body.invoiceSymbol || 'K26T',
        date,
        dueDate,
        partnerId: partner.id,
        subtotal: backendSubtotal,
        discountTotal: backendDiscountTotal,
        vatTotal: backendVatTotal,
        grandTotal: backendGrandTotal,
        note: body.note || 'Nhập hàng từ xưởng may D&D',
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

      // 3. Tạo phiếu nhập kho (inventory_logs)
      db.prepare(`
        INSERT INTO inventory_logs (
          id, code, date, type, invoice_ref, invoice_id, partner_id,
          partner_name, warehouse_name, stock_account_code, opposite_account_code,
          total_value, note, created_by, created_at
        ) VALUES (
          @id, @code, @date, 'IMPORT', @invoiceRef, @invoiceId, @partnerId,
          @partnerName, 'Kho Tổng Thời Trang D&D', '156', '331',
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
        totalValue: backendGrandTotal,
        note: `Nhập kho theo hóa đơn mua ${invoiceCode}`,
        createdBy: req.user?.id || null
      });

      // 4. Tạo chi tiết phiếu nhập kho (inventory_log_items)
      // Chú ý: Trigger 'trg_inventory_log_item_after_insert' sẽ tự động TĂNG tồn kho sản phẩm!
      const insertLogItemStmt = db.prepare(`
        INSERT INTO inventory_log_items (
          id, inventory_log_id, product_id, movement_type, item_code,
          item_name, unit, quantity, unit_price, total_amount
        ) VALUES (
          @id, @logId, @productId, 'IMPORT', @itemCode,
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
          unitPrice: it.unitPrice,
          totalAmount: it.totalAmount
        });
      }

      // 4.1 Cập nhật liên kết Nhà cung cấp - Sản phẩm & Giá nhập gần nhất
      const upsertSupplierProdStmt = db.prepare(`
        INSERT INTO supplier_products (
          id, supplier_id, product_id, last_purchase_price, is_active, created_at
        ) VALUES (
          @id, @supplierId, @productId, @lastPurchasePrice, 1, datetime('now')
        )
        ON CONFLICT(supplier_id, product_id) DO UPDATE SET
          last_purchase_price = excluded.last_purchase_price,
          is_active = 1
      `);

      for (let i = 0; i < validatedItems.length; i++) {
        const it = validatedItems[i];
        upsertSupplierProdStmt.run({
          id: `sp_${Date.now()}_${i + 1}_${Math.random().toString(36).substring(2, 6)}`,
          supplierId: partner.id,
          productId: it.productId,
          lastPurchasePrice: it.unitPrice
        });
      }

      // 5. Nếu có thanh toán ngay một phần hoặc toàn bộ (paidAmount > 0)
      if (paidAmount > 0) {
        const cashId = `cash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const cashCode = `PC${Date.now().toString().slice(-6)}`;
        const fundAccount = (body.paymentFund === '1121' || body.paymentFund === '112') ? '112' : '111';

        // Trigger 'trg_cash_transaction_after_insert' sẽ tự động cập nhật paid_amount & status của invoice!
        db.prepare(`
          INSERT INTO cash_transactions (
            id, code, date, type, person_name, reason, amount,
            opposite_account_code, fund_account_code, partner_id,
            invoice_id, invoice_ref, created_by, created_by_name, created_at
          ) VALUES (
            @id, @code, @date, 'CASH_PAYMENT', @personName, @reason, @amount,
            '331', @fundAccount, @partnerId, @invoiceId, @invoiceRef,
            @createdBy, @createdByName, datetime('now')
          )
        `).run({
          id: cashId,
          code: cashCode,
          date,
          personName: partner.name,
          reason: `Chi tiền thanh toán hóa đơn mua hàng ${invoiceCode}`,
          amount: paidAmount,
          fundAccount,
          partnerId: partner.id,
          invoiceId,
          invoiceRef: invoiceCode,
          createdBy: req.user?.id || null,
          createdByName: req.user?.name || 'Kế Toán Mua Hàng'
        });
      }
    });

    // Thực thi transaction
    transaction();

    // Lấy lại invoice vừa tạo cùng tồn kho mới nhất
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
        i.subtotal,
        i.discount_total as discountTotal,
        i.vat_total as vatTotal,
        i.grand_total as grandTotal,
        i.paid_amount as paidAmount,
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
        ii.total_amount as totalAmount,
        p.current_stock as newStock
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `).all(invoiceId);

    res.status(201).json({
      success: true,
      message: `Tạo hóa đơn nhập hàng ${invoiceCode} và tăng tồn kho thành công.`,
      invoice: {
        ...createdInvoice,
        items
      },
      stockUpdates: items.map((it: any) => ({
        productId: it.productId,
        code: it.itemCode,
        addedQuantity: it.quantity,
        currentStock: it.newStock
      }))
    });
  } catch (error: any) {
    console.error('Lỗi khi lập hóa đơn nhập hàng:', error);
    handleDbError(res, error);
  }
}

/**
 * Thanh toán thêm cho hóa đơn mua hàng
 * POST /api/purchases/:id/payments
 */
export function addPurchasePayment(req: AuthenticatedRequest, res: Response): void {
  try {
    const { id } = req.params;
    const { amount, date, paymentFund, note } = req.body;

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      res.status(400).json({ success: false, error: 'Số tiền thanh toán phải lớn hơn 0.' });
      return;
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND type = \'PURCHASE\'').get(id) as any;
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Không tìm thấy hóa đơn nhập hàng.' });
      return;
    }

    const partner = db.prepare('SELECT name FROM partners WHERE id = ?').get(invoice.partner_id) as any;
    const cashId = `cash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cashCode = `PC${Date.now().toString().slice(-6)}`;
    const fundAccount = (paymentFund === '1121' || paymentFund === '112') ? '112' : '111';

    // Trigger sẽ tự cập nhật invoices.paid_amount & status
    db.prepare(`
      INSERT INTO cash_transactions (
        id, code, date, type, person_name, reason, amount,
        opposite_account_code, fund_account_code, partner_id,
        invoice_id, invoice_ref, created_by, created_by_name, created_at
      ) VALUES (
        @id, @code, @date, 'CASH_PAYMENT', @personName, @reason, @amount,
        '331', @fundAccount, @partnerId, @invoiceId, @invoiceRef,
        @createdBy, @createdByName, datetime('now')
      )
    `).run({
      id: cashId,
      code: cashCode,
      date: date || new Date().toISOString().split('T')[0],
      personName: partner?.name || 'Nhà Cung Cấp',
      reason: note || `Thanh toán tiếp cho hóa đơn mua ${invoice.code}`,
      amount: paymentAmount,
      fundAccount,
      partnerId: invoice.partner_id,
      invoiceId: invoice.id,
      invoiceRef: invoice.code,
      createdBy: req.user?.id || null,
      createdByName: req.user?.name || 'Kế Toán Mua Hàng'
    });

    const updatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    res.json({
      success: true,
      message: 'Thanh toán hóa đơn thành công.',
      invoice: updatedInvoice
    });
  } catch (error: any) {
    handleDbError(res, error);
  }
}

/**
 * Xóa hóa đơn mua hàng / nhập hàng xưởng và điều chỉnh giảm tồn kho
 * DELETE /api/purchases/:id
 */
export function deletePurchase(req: AuthenticatedRequest, res: Response): void {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Thiếu ID hóa đơn cần xóa.' });
      return;
    }

    const invoice = db.prepare("SELECT * FROM invoices WHERE id = ? AND type = 'PURCHASE'").get(id) as any;
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Không tìm thấy hóa đơn nhập hàng.' });
      return;
    }

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id) as any[];

    const tx = db.transaction(() => {
      // 1. Trừ lại số lượng tồn kho sản phẩm đã nhập
      for (const item of items) {
        if (item.product_id) {
          db.prepare(`
            UPDATE products 
            SET current_stock = MAX(0, current_stock - ?),
                opening_value = MAX(0, (current_stock - ?) * cost_price),
                updated_at = datetime('now')
            WHERE id = ?
          `).run(item.quantity, item.quantity, item.product_id);
        }
      }

      // 2. Xóa các phiếu chi thanh toán liên kết
      db.prepare('DELETE FROM cash_transactions WHERE invoice_id = ?').run(id);

      // 3. Xóa các phiếu log kho liên kết
      db.prepare('DELETE FROM inventory_logs WHERE invoice_id = ?').run(id);

      // 4. Xóa chi tiết hóa đơn
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);

      // 5. Xóa hóa đơn
      db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    });

    tx();

    res.json({
      success: true,
      message: `Đã xóa đơn nhập hàng ${invoice.code} thành công.`
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi xóa hóa đơn mua hàng');
  }
}


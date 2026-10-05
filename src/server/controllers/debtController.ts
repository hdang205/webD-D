import { Request, Response } from 'express';
import db from '../../db/database.js';
import { handleDbError } from '../utils/dbErrors.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

function formatPartner(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    taxCode: row.tax_code || '',
    phone: row.phone || '',
    address: row.address || '',
    email: row.email || '',
    tier: row.tier || 'STANDARD',
    creditLimit: row.credit_limit || 0,
    bankAccount: row.bank_account || '',
    bankName: row.bank_name || '',
    openingDebtDebit: row.opening_debt_debit || 0,
    openingDebtCredit: row.opening_debt_credit || 0,
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

function formatCashTransaction(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    date: row.date,
    type: row.type,
    category: row.category || 'GENERAL',
    personName: row.person_name,
    personAddress: row.person_address || '',
    reason: row.reason,
    amount: row.amount,
    oppositeAccountCode: row.opposite_account_code,
    fundAccountCode: row.fund_account_code,
    partnerId: row.partner_id || undefined,
    partnerName: row.person_name,
    invoiceId: row.invoice_id || undefined,
    invoiceRef: row.invoice_ref || undefined,
    createdByName: row.created_by_name || '',
    note: row.note || ''
  };
}

/**
 * Thu nợ khách hàng (TK 131)
 * POST /api/debts/collect
 */
export function collectDebt(req: AuthenticatedRequest, res: Response): void {
  try {
    const { partnerId, amount, date, paymentMethod, note } = req.body || {};

    if (!partnerId || typeof partnerId !== 'string') {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã ID khách hàng.' });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Số tiền thu nợ phải lớn hơn 0.' });
      return;
    }

    const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId) as any;
    if (!partner) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin khách hàng trong hệ thống.' });
      return;
    }

    if (partner.type !== 'CUSTOMER' && partner.type !== 'BOTH') {
      res.status(400).json({ success: false, message: 'Đối tác này không phải là khách hàng để thu nợ.' });
      return;
    }

    // Lấy danh sách hóa đơn bán hàng chưa thanh toán đủ của khách hàng này
    const unpaidInvoices = db.prepare(`
      SELECT 
        id, code, invoice_symbol as invoiceSymbol, date, due_date as dueDate,
        type, partner_id as partnerId, subtotal, discount_total as discountTotal,
        vat_total as vatTotal, grand_total as grandTotal, paid_amount as paidAmount,
        (grand_total - paid_amount) as remainingDebt, status, note
      FROM invoices
      WHERE partner_id = ? AND type = 'SALES' AND status != 'PAID'
      ORDER BY date ASC, created_at ASC
    `).all(partnerId) as any[];

    const invoiceDebt = unpaidInvoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.paidAmount), 0);
    const totalReceivable = (partner.opening_debt_debit || 0) + invoiceDebt;

    if (numAmount > totalReceivable) {
      res.status(400).json({
        success: false,
        message: `Số tiền thu (${numAmount.toLocaleString('vi-VN')} ₫) không được vượt quá tổng nợ hiện tại (${totalReceivable.toLocaleString('vi-VN')} ₫).`
      });
      return;
    }

    const createdCashRows: any[] = [];
    const affectedInvoiceIds: string[] = [];

    const tx = db.transaction(() => {
      let remainingToCollect = numAmount;
      const timestamp = Date.now();
      const dateStr = date || new Date().toISOString().split('T')[0];
      const dateCompact = dateStr.replace(/-/g, '');
      const isBank = paymentMethod === 'BANK';
      const fundAccount = isBank ? '1121' : '1111';
      const transType = isBank ? 'BANK_DEPOSIT' : 'CASH_RECEIPT';
      let counter = 1;

      // 1. Khấu trừ vào các hóa đơn bán hàng chưa trả theo nguyên tắc FIFO (cũ nhất thanh toán trước)
      for (const inv of unpaidInvoices) {
        if (remainingToCollect <= 0) break;
        const invRemaining = inv.grandTotal - inv.paidAmount;
        if (invRemaining <= 0) continue;

        const alloc = Math.min(remainingToCollect, invRemaining);
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const cashId = `cash_col_${timestamp}_${counter}_${rand.toLowerCase()}`;
        const prefix = isBank ? 'BCN' : 'PTN'; // Báo Có Thu Nợ / Phiếu Thu Nợ
        const cashCode = `${prefix}-${dateCompact}-${rand}`;
        const reason = note?.trim() 
          ? `${note.trim()} (HĐ: ${inv.code})`
          : `Thu hồi công nợ khách hàng ${partner.name} - Đơn hàng ${inv.code}`;

        // Insert vào cash_transactions -> Trigger trg_cash_transaction_after_insert sẽ tự tăng paid_amount và cập nhật status hóa đơn
        db.prepare(`
          INSERT INTO cash_transactions (
            id, code, date, type, person_name, person_address, reason, amount,
            opposite_account_code, fund_account_code, partner_id, invoice_id,
            invoice_ref, category, created_by, created_by_name, note, created_at
          ) VALUES (
            @id, @code, @date, @type, @personName, @personAddress, @reason, @amount,
            '131', @fundAccountCode, @partnerId, @invoiceId,
            @invoiceRef, 'CUSTOMER_DEBT_COLLECTION', @createdBy, @createdByName, @note, datetime('now')
          )
        `).run({
          id: cashId,
          code: cashCode,
          date: dateStr,
          type: transType,
          personName: partner.name,
          personAddress: partner.address || '',
          reason,
          amount: alloc,
          fundAccountCode: fundAccount,
          partnerId: partner.id,
          invoiceId: inv.id,
          invoiceRef: inv.code,
          createdBy: req.user?.id || null,
          createdByName: req.user?.name || 'Kế Toán Thu Nợ',
          note: note || ''
        });

        createdCashRows.push(db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(cashId));
        affectedInvoiceIds.push(inv.id);
        remainingToCollect -= alloc;
        counter++;
      }

      // 2. Nếu số tiền thu lớn hơn nợ hóa đơn (hoặc khách hàng trả vào nợ đầu kỳ)
      if (remainingToCollect > 0) {
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const cashId = `cash_col_${timestamp}_${counter}_${rand.toLowerCase()}`;
        const prefix = isBank ? 'BCN' : 'PTN';
        const cashCode = `${prefix}-${dateCompact}-${rand}`;
        const reason = note?.trim() 
          ? `${note.trim()} (Dư nợ đầu kỳ)`
          : `Thu hồi công nợ đầu kỳ khách hàng ${partner.name}`;

        db.prepare(`
          UPDATE partners 
          SET opening_debt_debit = MAX(0, opening_debt_debit - ?)
          WHERE id = ?
        `).run(remainingToCollect, partner.id);

        db.prepare(`
          INSERT INTO cash_transactions (
            id, code, date, type, person_name, person_address, reason, amount,
            opposite_account_code, fund_account_code, partner_id, invoice_id,
            invoice_ref, category, created_by, created_by_name, note, created_at
          ) VALUES (
            @id, @code, @date, @type, @personName, @personAddress, @reason, @amount,
            '131', @fundAccountCode, @partnerId, NULL,
            NULL, 'CUSTOMER_DEBT_COLLECTION', @createdBy, @createdByName, @note, datetime('now')
          )
        `).run({
          id: cashId,
          code: cashCode,
          date: dateStr,
          type: transType,
          personName: partner.name,
          personAddress: partner.address || '',
          reason,
          amount: remainingToCollect,
          fundAccountCode: fundAccount,
          partnerId: partner.id,
          createdBy: req.user?.id || null,
          createdByName: req.user?.name || 'Kế Toán Thu Nợ',
          note: note || ''
        });

        createdCashRows.push(db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(cashId));
      }
    });

    tx();

    // Lấy lại thông tin đối tác và các hóa đơn mới nhất sau khi thanh toán
    const updatedPartner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId);
    
    // Lấy các hóa đơn bị ảnh hưởng
    const updatedInvoices: any[] = [];
    for (const invId of affectedInvoiceIds) {
      const invRow = db.prepare(`
        SELECT 
          id, code, invoice_symbol as invoiceSymbol, date, due_date as dueDate,
          type, partner_id as partnerId, subtotal, discount_total as discountTotal,
          vat_total as vatTotal, grand_total as grandTotal, paid_amount as paidAmount,
          status, note
        FROM invoices WHERE id = ?
      `).get(invId) as any;
      if (invRow) {
        const items = db.prepare(`
          SELECT 
            id, product_id as productId, product_id as itemId, item_code as itemCode,
            item_name as itemName, unit, quantity, unit_price as unitPrice,
            discount_rate as discountRate, discount_amount as discountAmount,
            vat_rate as vatRate, vat_amount as vatAmount, total_amount as totalAmount
          FROM invoice_items WHERE invoice_id = ?
        `).all(invId);
        updatedInvoices.push({ ...invRow, items, debtAmount: invRow.grandTotal - invRow.paidAmount });
      }
    }

    const newInvoiceDebtRow = db.prepare(`
      SELECT COALESCE(SUM(grand_total - paid_amount), 0) as totalDebt
      FROM invoices WHERE partner_id = ? AND type = 'SALES' AND status != 'PAID'
    `).get(partnerId) as any;
    const newTotalReceivable = ((updatedPartner as any)?.opening_debt_debit || 0) + (Number(newInvoiceDebtRow?.totalDebt) || 0);

    res.status(200).json({
      success: true,
      message: 'Thu nợ thành công',
      partner: formatPartner(updatedPartner),
      newDebt: newTotalReceivable,
      transactions: createdCashRows.map(formatCashTransaction),
      updatedInvoices
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi thực hiện thu nợ khách hàng');
  }
}

/**
 * Trả nợ nhà cung cấp (TK 331)
 * POST /api/debts/pay
 */
export function payDebt(req: AuthenticatedRequest, res: Response): void {
  try {
    const { partnerId, amount, date, paymentMethod, note } = req.body || {};

    if (!partnerId || typeof partnerId !== 'string') {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã ID nhà cung cấp.' });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Số tiền trả nợ phải lớn hơn 0.' });
      return;
    }

    const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId) as any;
    if (!partner) {
      res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp trong hệ thống.' });
      return;
    }

    if (partner.type !== 'SUPPLIER' && partner.type !== 'BOTH') {
      res.status(400).json({ success: false, message: 'Đối tác này không phải là nhà cung cấp để trả nợ.' });
      return;
    }

    // Lấy danh sách hóa đơn mua hàng / nhập hàng chưa trả đủ
    const unpaidInvoices = db.prepare(`
      SELECT 
        id, code, invoice_symbol as invoiceSymbol, date, due_date as dueDate,
        type, partner_id as partnerId, subtotal, discount_total as discountTotal,
        vat_total as vatTotal, grand_total as grandTotal, paid_amount as paidAmount,
        (grand_total - paid_amount) as remainingDebt, status, note
      FROM invoices
      WHERE partner_id = ? AND type = 'PURCHASE' AND status != 'PAID'
      ORDER BY date ASC, created_at ASC
    `).all(partnerId) as any[];

    const invoiceDebt = unpaidInvoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.paidAmount), 0);
    const totalPayable = (partner.opening_debt_credit || 0) + invoiceDebt;

    if (numAmount > totalPayable) {
      res.status(400).json({
        success: false,
        message: `Số tiền trả (${numAmount.toLocaleString('vi-VN')} ₫) không được vượt quá tổng nợ hiện tại (${totalPayable.toLocaleString('vi-VN')} ₫).`
      });
      return;
    }

    const createdCashRows: any[] = [];
    const affectedInvoiceIds: string[] = [];

    const tx = db.transaction(() => {
      let remainingToPay = numAmount;
      const timestamp = Date.now();
      const dateStr = date || new Date().toISOString().split('T')[0];
      const dateCompact = dateStr.replace(/-/g, '');
      const isBank = paymentMethod === 'BANK';
      const fundAccount = isBank ? '1121' : '1111';
      const transType = isBank ? 'BANK_WITHDRAWAL' : 'CASH_PAYMENT';
      let counter = 1;

      // 1. Khấu trừ vào các hóa đơn mua hàng chưa trả (FIFO)
      for (const inv of unpaidInvoices) {
        if (remainingToPay <= 0) break;
        const invRemaining = inv.grandTotal - inv.paidAmount;
        if (invRemaining <= 0) continue;

        const alloc = Math.min(remainingToPay, invRemaining);
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const cashId = `cash_pay_${timestamp}_${counter}_${rand.toLowerCase()}`;
        const prefix = isBank ? 'BNN' : 'PCN'; // Báo Nợ Trả Nợ / Phiếu Chi Trả Nợ
        const cashCode = `${prefix}-${dateCompact}-${rand}`;
        const reason = note?.trim() 
          ? `${note.trim()} (HĐM: ${inv.code})`
          : `Chi trả nợ nhà cung cấp ${partner.name} - Đơn nhập ${inv.code}`;

        // Insert vào cash_transactions -> Trigger trg_cash_transaction_after_insert sẽ tự tăng paid_amount và cập nhật status hóa đơn
        db.prepare(`
          INSERT INTO cash_transactions (
            id, code, date, type, person_name, person_address, reason, amount,
            opposite_account_code, fund_account_code, partner_id, invoice_id,
            invoice_ref, category, created_by, created_by_name, note, created_at
          ) VALUES (
            @id, @code, @date, @type, @personName, @personAddress, @reason, @amount,
            '331', @fundAccountCode, @partnerId, @invoiceId,
            @invoiceRef, 'SUPPLIER_DEBT_PAYMENT', @createdBy, @createdByName, @note, datetime('now')
          )
        `).run({
          id: cashId,
          code: cashCode,
          date: dateStr,
          type: transType,
          personName: partner.name,
          personAddress: partner.address || '',
          reason,
          amount: alloc,
          fundAccountCode: fundAccount,
          partnerId: partner.id,
          invoiceId: inv.id,
          invoiceRef: inv.code,
          createdBy: req.user?.id || null,
          createdByName: req.user?.name || 'Kế Toán Thanh Toán',
          note: note || ''
        });

        createdCashRows.push(db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(cashId));
        affectedInvoiceIds.push(inv.id);
        remainingToPay -= alloc;
        counter++;
      }

      // 2. Nếu số tiền trả lớn hơn nợ hóa đơn (hoặc trả vào nợ đầu kỳ)
      if (remainingToPay > 0) {
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const cashId = `cash_pay_${timestamp}_${counter}_${rand.toLowerCase()}`;
        const prefix = isBank ? 'BNN' : 'PCN';
        const cashCode = `${prefix}-${dateCompact}-${rand}`;
        const reason = note?.trim() 
          ? `${note.trim()} (Dư nợ đầu kỳ)`
          : `Chi trả nợ đầu kỳ nhà cung cấp ${partner.name}`;

        db.prepare(`
          UPDATE partners 
          SET opening_debt_credit = MAX(0, opening_debt_credit - ?)
          WHERE id = ?
        `).run(remainingToPay, partner.id);

        db.prepare(`
          INSERT INTO cash_transactions (
            id, code, date, type, person_name, person_address, reason, amount,
            opposite_account_code, fund_account_code, partner_id, invoice_id,
            invoice_ref, category, created_by, created_by_name, note, created_at
          ) VALUES (
            @id, @code, @date, @type, @personName, @personAddress, @reason, @amount,
            '331', @fundAccountCode, @partnerId, NULL,
            NULL, 'SUPPLIER_DEBT_PAYMENT', @createdBy, @createdByName, @note, datetime('now')
          )
        `).run({
          id: cashId,
          code: cashCode,
          date: dateStr,
          type: transType,
          personName: partner.name,
          personAddress: partner.address || '',
          reason,
          amount: remainingToPay,
          fundAccountCode: fundAccount,
          partnerId: partner.id,
          createdBy: req.user?.id || null,
          createdByName: req.user?.name || 'Kế Toán Thanh Toán',
          note: note || ''
        });

        createdCashRows.push(db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(cashId));
      }
    });

    tx();

    const updatedPartner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId);
    
    const updatedInvoices: any[] = [];
    for (const invId of affectedInvoiceIds) {
      const invRow = db.prepare(`
        SELECT 
          id, code, invoice_symbol as invoiceSymbol, date, due_date as dueDate,
          type, partner_id as partnerId, subtotal, discount_total as discountTotal,
          vat_total as vatTotal, grand_total as grandTotal, paid_amount as paidAmount,
          status, note
        FROM invoices WHERE id = ?
      `).get(invId) as any;
      if (invRow) {
        const items = db.prepare(`
          SELECT 
            id, product_id as productId, product_id as itemId, item_code as itemCode,
            item_name as itemName, unit, quantity, unit_price as unitPrice,
            discount_rate as discountRate, discount_amount as discountAmount,
            vat_rate as vatRate, vat_amount as vatAmount, total_amount as totalAmount
          FROM invoice_items WHERE invoice_id = ?
        `).all(invId);
        updatedInvoices.push({ ...invRow, items, debtAmount: invRow.grandTotal - invRow.paidAmount });
      }
    }

    const newInvoiceDebtRow = db.prepare(`
      SELECT COALESCE(SUM(grand_total - paid_amount), 0) as totalDebt
      FROM invoices WHERE partner_id = ? AND type = 'PURCHASE' AND status != 'PAID'
    `).get(partnerId) as any;
    const newTotalPayable = ((updatedPartner as any)?.opening_debt_credit || 0) + (Number(newInvoiceDebtRow?.totalDebt) || 0);

    res.status(200).json({
      success: true,
      message: 'Trả nợ thành công',
      partner: formatPartner(updatedPartner),
      newDebt: newTotalPayable,
      transactions: createdCashRows.map(formatCashTransaction),
      updatedInvoices
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi thực hiện trả nợ nhà cung cấp');
  }
}

/**
 * Lấy danh sách tất cả giao dịch tiền mặt / ngân hàng từ SQLite
 * GET /api/debts/transactions
 */
export function getDebtTransactions(_req: Request, res: Response): void {
  try {
    const rows = db.prepare(`
      SELECT * FROM cash_transactions 
      ORDER BY date DESC, created_at DESC
    `).all();

    res.status(200).json({
      success: true,
      data: rows.map(formatCashTransaction)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tải danh sách giao dịch sổ quỹ');
  }
}

/**
 * Tạo mới phiếu thu / phiếu chi sổ quỹ
 * POST /api/debts/transactions
 */
export function createCashTransaction(req: AuthenticatedRequest, res: Response): void {
  try {
    const {
      code,
      date,
      type,
      personName,
      personAddress,
      reason,
      amount,
      oppositeAccountCode,
      fundAccountCode,
      partnerId,
      note
    } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, error: 'Số tiền thu/chi phải lớn hơn 0.' });
      return;
    }

    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, error: 'Lý do thu/chi không được để trống.' });
      return;
    }

    const validTypes = ['CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_DEPOSIT', 'BANK_WITHDRAWAL'];
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({ success: false, error: 'Loại nghiệp vụ thu/chi không hợp lệ.' });
      return;
    }

    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const isReceipt = type === 'CASH_RECEIPT' || type === 'BANK_DEPOSIT';
    const isBank = type === 'BANK_DEPOSIT' || type === 'BANK_WITHDRAWAL';
    const prefix = isReceipt ? (isBank ? 'BC' : 'PT') : (isBank ? 'BN' : 'PC');
    const transId = `cash_${timestamp}_${rand.toLowerCase()}`;
    const transCode = (typeof code === 'string' && code.trim()) ? code.trim() : `${prefix}-${timestamp.toString().slice(-6)}`;
    const transDate = (typeof date === 'string' && date.trim()) ? date.trim() : new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO cash_transactions (
        id, code, date, type, person_name, person_address, reason, amount,
        opposite_account_code, fund_account_code, partner_id, created_by,
        created_by_name, note, created_at
      ) VALUES (
        @id, @code, @date, @type, @personName, @personAddress, @reason, @amount,
        @oppositeAccountCode, @fundAccountCode, @partnerId, @createdBy,
        @createdByName, @note, datetime('now')
      )
    `).run({
      id: transId,
      code: transCode,
      date: transDate,
      type,
      personName: (personName && personName.trim()) || (isReceipt ? 'Người nộp tiền' : 'Người nhận tiền'),
      personAddress: personAddress || '',
      reason: reason.trim(),
      amount: numAmount,
      oppositeAccountCode: oppositeAccountCode || (isReceipt ? '511' : '642'),
      fundAccountCode: fundAccountCode || (isBank ? '1121' : '1111'),
      partnerId: partnerId || null,
      createdBy: req.user?.id || null,
      createdByName: req.user?.name || 'Thủ Quỹ D&D',
      note: note || ''
    });

    const created = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(transId);

    res.status(201).json({
      success: true,
      message: `Lập ${isReceipt ? 'phiếu thu' : 'phiếu chi'} ${transCode} thành công.`,
      transaction: formatCashTransaction(created)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tạo giao dịch sổ quỹ');
  }
}

/**
 * Xóa giao dịch thu chi sổ quỹ
 * DELETE /api/debts/transactions/:id
 */
export function deleteCashTransaction(req: AuthenticatedRequest, res: Response): void {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Thiếu ID giao dịch cần xóa.' });
      return;
    }

    const existing = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy chứng từ thu chi.' });
      return;
    }

    db.prepare('DELETE FROM cash_transactions WHERE id = ?').run(id);

    res.json({
      success: true,
      message: `Đã xóa chứng từ ${existing.code} thành công.`
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi xóa giao dịch sổ quỹ');
  }
}


import { Request, Response } from 'express';
import db from '../../db/database.js';
import { handleDbError } from '../utils/dbErrors.js';

// Regex kiểm tra số điện thoại (Việt Nam: 9 - 11 chữ số)
const PHONE_REGEX = /^[0-9+.\s-]{9,15}$/;
// Regex kiểm tra email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Chuẩn hóa đối tượng partner từ DB sang JSON camelCase
 */
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

/**
 * Lấy danh sách Khách hàng
 * GET /api/customers?search=...&tier=...
 */
export function getCustomers(req: Request, res: Response): void {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const tier = typeof req.query.tier === 'string' ? req.query.tier.trim() : '';

    let sql = `
      SELECT * FROM partners 
      WHERE type IN ('CUSTOMER', 'BOTH')
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR address LIKE ? OR tax_code LIKE ?) `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    if (tier && tier !== 'ALL') {
      sql += ` AND tier = ? `;
      params.push(tier);
    }

    sql += ` ORDER BY created_at DESC `;

    const rows = db.prepare(sql).all(...params);
    res.status(200).json({
      success: true,
      data: rows.map(formatPartner)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tải danh sách khách hàng');
  }
}

/**
 * Lấy danh sách Nhà cung cấp
 * GET /api/suppliers?search=...
 */
export function getSuppliers(req: Request, res: Response): void {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let sql = `
      SELECT * FROM partners 
      WHERE type IN ('SUPPLIER', 'BOTH')
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR address LIKE ? OR tax_code LIKE ?) `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    sql += ` ORDER BY created_at DESC `;

    const rows = db.prepare(sql).all(...params);
    res.status(200).json({
      success: true,
      data: rows.map(formatPartner)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tải danh sách nhà cung cấp');
  }
}

/**
 * Lấy chi tiết một đối tác (Khách hàng hoặc NCC)
 * GET /api/customers/:id hoặc GET /api/suppliers/:id
 */
export function getPartnerById(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ' });
      return;
    }

    const row = db.prepare('SELECT * FROM partners WHERE id = ? OR code = ?').get(id, id);
    if (!row) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đối tác' });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatPartner(row)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi lấy thông tin đối tác');
  }
}

/**
 * Hàm dùng chung tạo mới Partner (Khách hàng hoặc NCC)
 */
function handleCreatePartner(req: Request, res: Response, defaultType: 'CUSTOMER' | 'SUPPLIER'): void {
  try {
    const {
      code,
      name,
      type,
      taxCode,
      phone,
      address,
      email,
      tier,
      creditLimit,
      bankAccount,
      bankName,
      openingDebtDebit,
      openingDebtCredit,
      notes
    } = req.body || {};

    const errors: Record<string, string> = {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Tên đối tác là bắt buộc';
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      errors.phone = 'Số điện thoại là bắt buộc';
    } else if (!PHONE_REGEX.test(phone.trim())) {
      errors.phone = 'Số điện thoại không đúng định dạng (từ 9 đến 15 chữ số)';
    } else {
      const cleanPhone = phone.trim();
      const existingPartnerWithPhone = db.prepare('SELECT id, code, name FROM partners WHERE phone = ?').get(cleanPhone) as any;
      if (existingPartnerWithPhone) {
        errors.phone = `Số điện thoại "${cleanPhone}" đã tồn tại trong hệ thống (${existingPartnerWithPhone.name} - ${existingPartnerWithPhone.code})`;
      }
    }

    if (email && typeof email === 'string' && email.trim() && !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Địa chỉ email không đúng định dạng';
    }

    const numCreditLimit = Number(creditLimit ?? (defaultType === 'CUSTOMER' ? 20000000 : 100000000));
    const numOpeningDebit = Number(openingDebtDebit ?? 0);
    const numOpeningCredit = Number(openingDebtCredit ?? 0);

    if (isNaN(numCreditLimit) || numCreditLimit < 0) {
      errors.creditLimit = 'Hạn mức nợ phải là số không âm';
    }
    if (isNaN(numOpeningDebit) || numOpeningDebit < 0) {
      errors.openingDebtDebit = 'Nợ đầu kỳ phải thu phải là số không âm';
    }
    if (isNaN(numOpeningCredit) || numOpeningCredit < 0) {
      errors.openingDebtCredit = 'Nợ đầu kỳ phải trả phải là số không âm';
    }

    const partnerType = (type === 'CUSTOMER' || type === 'SUPPLIER' || type === 'BOTH') ? type : defaultType;

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu đối tác không hợp lệ',
        errors
      });
      return;
    }

    const prefix = partnerType === 'SUPPLIER' ? 'NCC' : 'KH';
    const cleanCode = (typeof code === 'string' && code.trim())
      ? code.trim().toUpperCase()
      : `${prefix}${Date.now().toString().slice(-6)}`;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = (typeof address === 'string' && address.trim()) ? address.trim() : 'Chưa cập nhật địa chỉ';
    const cleanTaxCode = (typeof taxCode === 'string' && taxCode.trim()) ? taxCode.trim() : null;
    const cleanEmail = (typeof email === 'string' && email.trim()) ? email.trim() : null;
    const cleanTier = partnerType !== 'SUPPLIER' ? (tier || 'STANDARD') : null;
    const cleanBankAccount = (typeof bankAccount === 'string' && bankAccount.trim()) ? bankAccount.trim() : null;
    const cleanBankName = (typeof bankName === 'string' && bankName.trim()) ? bankName.trim() : null;
    const cleanNotes = (typeof notes === 'string' && notes.trim()) ? notes.trim() : null;
    const newId = `p_${defaultType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const insertStmt = db.prepare(`
      INSERT INTO partners (
        id, code, name, type, tax_code, phone, address, email,
        tier, credit_limit, bank_account, bank_name,
        opening_debt_debit, opening_debt_credit, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      newId,
      cleanCode,
      cleanName,
      partnerType,
      cleanTaxCode,
      cleanPhone,
      cleanAddress,
      cleanEmail,
      cleanTier,
      numCreditLimit,
      cleanBankAccount,
      cleanBankName,
      numOpeningDebit,
      numOpeningCredit,
      cleanNotes
    );

    const created = db.prepare('SELECT * FROM partners WHERE id = ?').get(newId);

    res.status(201).json({
      success: true,
      message: `Thêm ${defaultType === 'CUSTOMER' ? 'khách hàng' : 'nhà cung cấp'} thành công`,
      data: formatPartner(created)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tạo mới đối tác');
  }
}

/**
 * Thêm mới Khách hàng
 * POST /api/customers
 */
export function createCustomer(req: Request, res: Response): void {
  handleCreatePartner(req, res, 'CUSTOMER');
}

/**
 * Thêm mới Nhà cung cấp
 * POST /api/suppliers
 */
export function createSupplier(req: Request, res: Response): void {
  handleCreatePartner(req, res, 'SUPPLIER');
}

/**
 * Cập nhật thông tin đối tác
 * PUT /api/customers/:id hoặc PUT /api/suppliers/:id
 */
export function updatePartner(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ' });
      return;
    }

    const existing = db.prepare('SELECT * FROM partners WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đối tác' });
      return;
    }

    const {
      code,
      name,
      taxCode,
      phone,
      address,
      email,
      tier,
      creditLimit,
      bankAccount,
      bankName,
      openingDebtDebit,
      openingDebtCredit,
      notes
    } = req.body || {};

    const errors: Record<string, string> = {};

    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      errors.name = 'Tên đối tác không được để trống';
    }

    if (phone !== undefined && (!phone || typeof phone !== 'string' || !phone.trim())) {
      errors.phone = 'Số điện thoại không được để trống';
    } else if (phone !== undefined && !PHONE_REGEX.test(String(phone).trim())) {
      errors.phone = 'Số điện thoại không đúng định dạng';
    } else if (phone !== undefined) {
      const cleanPhone = String(phone).trim();
      const existingPartnerWithPhone = db.prepare('SELECT id, code, name FROM partners WHERE phone = ? AND id != ?').get(cleanPhone, id) as any;
      if (existingPartnerWithPhone) {
        errors.phone = `Số điện thoại "${cleanPhone}" đã tồn tại trong hệ thống (${existingPartnerWithPhone.name} - ${existingPartnerWithPhone.code})`;
      }
    }

    if (email !== undefined && email && !EMAIL_REGEX.test(String(email).trim())) {
      errors.email = 'Email không đúng định dạng';
    }

    const numCreditLimit = creditLimit !== undefined ? Number(creditLimit) : existing.credit_limit;
    const numOpeningDebit = openingDebtDebit !== undefined ? Number(openingDebtDebit) : existing.opening_debt_debit;
    const numOpeningCredit = openingDebtCredit !== undefined ? Number(openingDebtCredit) : existing.opening_debt_credit;

    if (isNaN(numCreditLimit) || numCreditLimit < 0) errors.creditLimit = 'Hạn mức nợ không hợp lệ';
    if (isNaN(numOpeningDebit) || numOpeningDebit < 0) errors.openingDebtDebit = 'Nợ đầu kỳ thu không hợp lệ';
    if (isNaN(numOpeningCredit) || numOpeningCredit < 0) errors.openingDebtCredit = 'Nợ đầu kỳ trả không hợp lệ';

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu cập nhật đối tác không hợp lệ',
        errors
      });
      return;
    }

    const cleanCode = code !== undefined ? code.trim().toUpperCase() : existing.code;
    const cleanName = name !== undefined ? name.trim() : existing.name;
    const cleanPhone = phone !== undefined ? phone.trim() : existing.phone;
    const cleanAddress = address !== undefined ? address.trim() : existing.address;
    const cleanTaxCode = taxCode !== undefined ? (taxCode ? taxCode.trim() : null) : existing.tax_code;
    const cleanEmail = email !== undefined ? (email ? email.trim() : null) : existing.email;
    const cleanTier = tier !== undefined ? tier : existing.tier;
    const cleanBankAccount = bankAccount !== undefined ? (bankAccount ? bankAccount.trim() : null) : existing.bank_account;
    const cleanBankName = bankName !== undefined ? (bankName ? bankName.trim() : null) : existing.bank_name;
    const cleanNotes = notes !== undefined ? (notes ? notes.trim() : null) : existing.notes;

    db.prepare(`
      UPDATE partners
      SET code = ?, name = ?, tax_code = ?, phone = ?, address = ?, email = ?,
          tier = ?, credit_limit = ?, bank_account = ?, bank_name = ?,
          opening_debt_debit = ?, opening_debt_credit = ?, notes = ?
      WHERE id = ?
    `).run(
      cleanCode,
      cleanName,
      cleanTaxCode,
      cleanPhone,
      cleanAddress,
      cleanEmail,
      cleanTier,
      numCreditLimit,
      cleanBankAccount,
      cleanBankName,
      numOpeningDebit,
      numOpeningCredit,
      cleanNotes,
      id
    );

    const updated = db.prepare('SELECT * FROM partners WHERE id = ?').get(id);

    res.status(200).json({
      success: true,
      message: 'Cập nhật đối tác thành công',
      data: formatPartner(updated)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi cập nhật đối tác');
  }
}

/**
 * Xóa đối tác
 * DELETE /api/customers/:id hoặc DELETE /api/suppliers/:id
 */
export function deletePartner(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID đối tác không hợp lệ' });
      return;
    }

    const existing = db.prepare('SELECT id, name, code, type FROM partners WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: 'Đối tác không tồn tại' });
      return;
    }

    // Kiểm tra ràng buộc hóa đơn & phiếu thu chi
    const invoiceCount = (db.prepare('SELECT COUNT(*) as count FROM invoices WHERE partner_id = ?').get(id) as any)?.count || 0;
    const cashCount = (db.prepare('SELECT COUNT(*) as count FROM cash_transactions WHERE partner_id = ?').get(id) as any)?.count || 0;

    if (invoiceCount > 0 || cashCount > 0) {
      res.status(409).json({
        success: false,
        message: `Không thể xóa đối tác "${existing.name}" (${existing.code}) do đã có ${invoiceCount} hóa đơn và ${cashCount} phiếu thu chi phát sinh.`
      });
      return;
    }

    db.prepare('DELETE FROM partners WHERE id = ?').run(id);

    res.status(200).json({
      success: true,
      message: `Đã xóa đối tác "${existing.name}" thành công`
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi xóa đối tác');
  }
}

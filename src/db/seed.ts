import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getDatabase, initializeSchema, closeDatabase } from './database.js';
import { 
  INITIAL_COMPANY_INFO, 
  INITIAL_PARTNERS, 
  INITIAL_INVENTORY, 
  INITIAL_INVOICES, 
  INITIAL_CASH_TRANSACTIONS, 
  INITIAL_INVENTORY_LOGS, 
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_EMPLOYEES,
  INITIAL_REQUISITIONS,
  INITIAL_CARE_LOGS,
  INITIAL_CARE_REMINDERS
} from '../data/initialData.js';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts.js';

// Khởi tạo danh mục nhóm hàng chuẩn hóa
const INITIAL_CATEGORIES = [
  { id: 'cat_aokhoac', code: 'CAT_AOKHOAC', name: 'Áo khoác', description: 'Áo khoác, măng tô, áo phao, blazer thời trang' },
  { id: 'cat_damvay', code: 'CAT_DAMVAY', name: 'Đầm/Váy', description: 'Đầm xòe, đầm dạ hội, chân váy, váy công sở' },
  { id: 'cat_jeans', code: 'CAT_JEANS', name: 'Quần jeans', description: 'Quần bò denim dáng ôm, ống suông, cạp cao tôn dáng' },
  { id: 'cat_tuixach', code: 'CAT_TUIXACH', name: 'Túi xách', description: 'Túi xách da thật, clutch tiệc, túi đeo chéo' },
  { id: 'cat_giaydepnu', code: 'CAT_GIAYDEPNU', name: 'Giày dép nữ', description: 'Giày cao gót, sandal, giày búp bê, sneaker nữ' },
  { id: 'cat_aothun', code: 'CAT_AOTHUN', name: 'Áo thun', description: 'Áo phông thun cotton, áo polo, áo thun in họa tiết' },
  { id: 'cat_somi', code: 'CAT_SOMI', name: 'Áo sơ mi', description: 'Sơ mi lụa tơ tằm, sơ mi công sở, sơ mi thiết kế cao cấp' }
];

// Hàm map category text sang category id
function mapCategoryToId(categoryName: string): string {
  const norm = categoryName.trim().toLowerCase();
  if (norm.includes('khoác') || norm.includes('blazer')) return 'cat_aokhoac';
  if (norm.includes('đầm') || norm.includes('váy')) return 'cat_damvay';
  if (norm.includes('jean') || norm.includes('bò')) return 'cat_jeans';
  if (norm.includes('túi') || norm.includes('phụ kiện')) return 'cat_tuixach';
  if (norm.includes('giày') || norm.includes('dép') || norm.includes('sneaker')) return 'cat_giaydepnu';
  if (norm.includes('thun') || norm.includes('t-shirt') || norm.includes('phông')) return 'cat_aothun';
  if (norm.includes('sơ mi') || norm.includes('somi')) return 'cat_somi';
  const match = INITIAL_CATEGORIES.find(c => c.name.toLowerCase() === norm);
  return match ? match.id : 'cat_somi';
}

export function runSeed(clean: boolean = true): void {
  if (clean) {
    console.log('  🧹 Dọn dẹp dữ liệu cũ & khởi tạo lại database...');
    closeDatabase();
    const dbPath = path.resolve(process.cwd(), 'data', 'fashion_erp.db');
    for (const ext of ['', '-wal', '-shm']) {
      const p = dbPath + ext;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
  }

  const db = getDatabase();
  initializeSchema(db);
  console.log('🔄 Bắt đầu nạp (seed) dữ liệu mẫu vào SQLite...');

  // Sử dụng transaction để đảm bảo toàn vẹn dữ liệu
  const seedTransaction = db.transaction(() => {

    // 2. Nạp Company Info
    console.log('  🏢 Đang nạp thông tin doanh nghiệp (company_info)...');
    const insertCompany = db.prepare(`
      INSERT INTO company_info (
        id, name, tax_code, address, phone, email, bank_account, bank_name, 
        director_name, chief_accountant, treasurer_name, accounting_standard, fiscal_year
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCompany.run(
      INITIAL_COMPANY_INFO.name,
      INITIAL_COMPANY_INFO.taxCode,
      INITIAL_COMPANY_INFO.address,
      INITIAL_COMPANY_INFO.phone,
      INITIAL_COMPANY_INFO.email,
      INITIAL_COMPANY_INFO.bankAccount,
      INITIAL_COMPANY_INFO.bankName,
      INITIAL_COMPANY_INFO.directorName,
      INITIAL_COMPANY_INFO.chiefAccountant,
      INITIAL_COMPANY_INFO.treasurerName,
      INITIAL_COMPANY_INFO.accountingStandard,
      INITIAL_COMPANY_INFO.fiscalYear
    );

    // 3. Nạp Hệ Thống Tài Khoản Kế Toán (accounts)
    console.log('  📑 Đang nạp hệ thống tài khoản TT133/200 (accounts)...');
    const insertAccount = db.prepare(`
      INSERT INTO accounts (
        code, name, parent_code, type, level, is_detail, opening_debit, opening_credit, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Sắp xếp nạp tài khoản cha trước (level tăng dần) để không vi phạm FK
    const sortedAccounts = [...DEFAULT_CHART_OF_ACCOUNTS].sort((a, b) => a.level - b.level);
    for (const acc of sortedAccounts) {
      insertAccount.run(
        acc.code,
        acc.name,
        acc.parentCode || null,
        acc.type,
        acc.level,
        acc.isDetail ? 1 : 0,
        acc.openingDebit || 0,
        acc.openingCredit || 0,
        acc.description || null
      );
    }

    // 4. Nạp Danh mục nhóm hàng (categories)
    console.log('  👗 Đang nạp danh mục thời trang (categories)...');
    const insertCategory = db.prepare(`
      INSERT INTO categories (id, code, name, description)
      VALUES (?, ?, ?, ?)
    `);
    for (const cat of INITIAL_CATEGORIES) {
      insertCategory.run(cat.id, cat.code, cat.name, cat.description);
    }

    // 5. Nạp Sản phẩm / Tồn kho (products)
    console.log('  📦 Đang nạp danh sách sản phẩm & tồn kho ban đầu (products)...');
    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, code, name, unit, category_id, size, color, barcode, image_url,
        cost_price, selling_price, opening_quantity, opening_value, current_stock, min_stock_level, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of INITIAL_INVENTORY) {
      const catId = mapCategoryToId(item.category);
      insertProduct.run(
        item.id,
        item.code,
        item.name,
        item.unit,
        catId,
        item.size || null,
        item.color || null,
        item.barcode || null,
        item.imageUrl || null,
        item.costPrice,
        item.sellingPrice,
        item.openingQuantity,
        item.openingValue,
        item.openingQuantity, // current_stock ban đầu bằng openingQuantity
        item.minStockLevel,
        item.description || null
      );
    }

    // 6. Nạp Đối tác Khách hàng & NCC (partners)
    console.log('  🤝 Đang nạp khách hàng & nhà cung cấp (partners)...');
    const insertPartner = db.prepare(`
      INSERT INTO partners (
        id, code, name, type, tax_code, phone, address, email,
        tier, credit_limit, bank_account, bank_name, opening_debt_debit, opening_debt_credit, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of INITIAL_PARTNERS) {
      insertPartner.run(
        p.id,
        p.code,
        p.name,
        p.type,
        p.taxCode || null,
        p.phone,
        p.address,
        p.email || null,
        p.tier || null,
        p.creditLimit || 0,
        p.bankAccount || null,
        p.bankName || null,
        p.openingDebtDebit || 0,
        p.openingDebtCredit || 0,
        p.notes || null
      );
    }

    // 7. Nạp Users có password_hash (bcrypt) & role
    console.log('  🔐 Đang tạo tài khoản người dùng & băm mật khẩu (users)...');
    const defaultPasswordHash = bcrypt.hashSync('123456', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, username, password_hash, name, role, role_title, email, phone, avatar, branch, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    // Tạo user cho từng nhân viên
    for (const emp of INITIAL_EMPLOYEES) {
      const userId = `usr_${emp.id}`;
      const username = emp.username || `user_${emp.code.toLowerCase()}`;
      insertUser.run(
        userId,
        username,
        defaultPasswordHash,
        emp.name,
        emp.role,
        emp.position,
        emp.email,
        emp.phone,
        emp.avatar || '👤',
        emp.branch
      );
    }

    // 8. Nạp Nhân viên (employees) liên kết với users
    console.log('  👥 Đang nạp hồ sơ nhân viên (employees)...');
    const insertEmployee = db.prepare(`
      INSERT INTO employees (
        id, code, user_id, name, gender, birthday, id_card_number, phone, email, address,
        department, position, role, branch, avatar, start_date, base_salary, allowance,
        commission_rate, insurance_salary, bank_account, bank_name, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const emp of INITIAL_EMPLOYEES) {
      const userId = `usr_${emp.id}`;
      insertEmployee.run(
        emp.id,
        emp.code,
        userId,
        emp.name,
        emp.gender,
        emp.birthday || null,
        emp.idCardNumber || null,
        emp.phone,
        emp.email,
        emp.address || null,
        emp.department,
        emp.position,
        emp.role,
        emp.branch,
        emp.avatar || null,
        emp.startDate,
        emp.baseSalary,
        emp.allowance,
        emp.commissionRate,
        emp.insuranceSalary || 0,
        emp.bankAccount || null,
        emp.bankName || null,
        emp.status,
        emp.notes || null
      );
    }

    // 9. Nạp Hóa đơn (invoices) & Chi tiết (invoice_items)
    console.log('  🧾 Đang nạp hóa đơn & chi tiết hóa đơn (invoices & invoice_items)...');
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        id, code, invoice_symbol, date, due_date, type, partner_id,
        subtotal, discount_total, vat_total, grand_total, paid_amount, status, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertInvoiceItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, product_id, item_code, item_name, unit,
        quantity, unit_price, discount_rate, discount_amount, vat_rate, vat_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const inv of INITIAL_INVOICES) {
      insertInvoice.run(
        inv.id,
        inv.code,
        inv.invoiceSymbol || null,
        inv.date,
        inv.dueDate || null,
        inv.type,
        inv.partnerId,
        inv.subtotal,
        inv.discountTotal,
        inv.vatTotal,
        inv.grandTotal,
        inv.paidAmount,
        inv.status,
        inv.note || null
      );

      for (const itm of inv.items) {
        insertInvoiceItem.run(
          itm.id,
          inv.id,
          itm.itemId,
          itm.itemCode,
          itm.itemName,
          itm.unit,
          itm.quantity,
          itm.unitPrice,
          itm.discountRate || 0,
          itm.discountAmount || 0,
          itm.vatRate || 0,
          itm.vatAmount || 0,
          itm.totalAmount
        );
      }
    }

    // 10. Nạp Phiếu Xuất Nhập Kho (inventory_logs & inventory_log_items)
    console.log('  🚚 Đang nạp phiếu xuất nhập kho (inventory_logs & items)...');
    const insertInvLog = db.prepare(`
      INSERT INTO inventory_logs (
        id, code, date, type, invoice_ref, invoice_id, partner_id, partner_name,
        deliverer_or_receiver, warehouse_name, stock_account_code, opposite_account_code, total_value, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertInvLogItem = db.prepare(`
      INSERT INTO inventory_log_items (
        id, inventory_log_id, product_id, movement_type, item_code, item_name, unit, quantity, unit_price, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const log of INITIAL_INVENTORY_LOGS) {
      // Tìm invoiceId nếu có invoiceRef khớp
      const matchedInvoice = INITIAL_INVOICES.find(i => i.code === log.invoiceRef);
      insertInvLog.run(
        log.id,
        log.code,
        log.date,
        log.type,
        log.invoiceRef || null,
        matchedInvoice ? matchedInvoice.id : null,
        log.partnerId || null,
        log.partnerName || null,
        log.delivererOrReceiver || null,
        log.warehouseName || 'Kho Tổng Thời Trang D&D',
        log.stockAccountCode || '156',
        log.oppositeAccountCode || (log.type === 'IMPORT' ? '331' : '632'),
        log.totalValue,
        log.note || null
      );

      for (let i = 0; i < log.items.length; i++) {
        const itm = log.items[i];
        insertInvLogItem.run(
          `${log.id}_item_${i + 1}`,
          log.id,
          itm.itemId,
          log.type,
          itm.itemCode,
          itm.itemName,
          itm.unit,
          itm.quantity,
          itm.unitPrice,
          itm.totalAmount
        );
      }
    }

    // 11. Nạp Sổ Quỹ / Giao Dịch Tiền (cash_transactions)
    console.log('  💰 Đang nạp giao dịch thu chi sổ quỹ (cash_transactions)...');
    const insertCash = db.prepare(`
      INSERT INTO cash_transactions (
        id, code, date, type, person_name, person_address, reason, amount,
        opposite_account_code, fund_account_code, partner_id, invoice_id, invoice_ref, created_by_name, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const cash of INITIAL_CASH_TRANSACTIONS) {
      insertCash.run(
        cash.id,
        cash.code,
        cash.date,
        cash.type,
        cash.personName,
        cash.personAddress || null,
        cash.reason,
        cash.amount,
        cash.oppositeAccountCode,
        cash.fundAccountCode,
        cash.partnerId || null,
        null, // invoice_id để null cho các giao dịch khởi tạo ban đầu, kiểm tra liên kết riêng
        cash.invoiceRef || null,
        cash.createdByName,
        cash.note || null
      );
    }

    // 12. Nạp Bút Toán Sổ Nhật Ký Chung (journal_entries & details)
    console.log('  📖 Đang nạp nhật ký chung & định khoản Nợ/Có (journal_entries & details)...');
    const insertJournalEntry = db.prepare(`
      INSERT INTO journal_entries (
        id, code, date, description, document_ref, document_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertJournalDetail = db.prepare(`
      INSERT INTO journal_details (
        id, journal_entry_id, account_code, account_name, debit_amount, credit_amount
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const je of INITIAL_JOURNAL_ENTRIES) {
      insertJournalEntry.run(
        je.id,
        je.code,
        je.date,
        je.description,
        je.documentRef || null,
        je.documentType || 'MANUAL',
        je.createdAt
      );

      for (let i = 0; i < je.details.length; i++) {
        const d = je.details[i];
        insertJournalDetail.run(
          `${je.id}_det_${i + 1}`,
          je.id,
          d.accountCode,
          d.accountName,
          d.debitAmount,
          d.creditAmount
        );
      }
    }

    // 13. Nạp Phiếu Đề Xuất Nhập Xuất Hàng (stock_requisitions & items)
    console.log('  📋 Đang nạp phiếu đề xuất nhập/xuất (stock_requisitions & items)...');
    const insertReq = db.prepare(`
      INSERT INTO stock_requisitions (
        id, code, date, type, urgency, reason, requester_id, requester_name, requester_role,
        department, suggested_supplier_id, suggested_supplier_name, total_estimated_amount,
        status, approver_id, approver_name, approval_date, approval_notes, created_document_ref, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertReqItem = db.prepare(`
      INSERT INTO requisition_items (
        id, requisition_id, product_id, item_code, item_name, category_id,
        size, color, unit, current_stock, requested_qty, approved_qty,
        estimated_unit_price, total_estimated, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const req of INITIAL_REQUISITIONS) {
      insertReq.run(
        req.id,
        req.code,
        req.date,
        req.type,
        req.urgency,
        req.reason,
        req.requesterId,
        req.requesterName,
        req.requesterRole,
        req.department,
        req.suggestedSupplierId || null,
        req.suggestedSupplierName || null,
        req.totalEstimatedAmount || 0,
        req.status,
        req.approverId || null,
        req.approverName || null,
        req.approvalDate || null,
        req.approvalNotes || null,
        req.createdDocumentRef || null,
        req.notes || null
      );

      for (const itm of req.items) {
        insertReqItem.run(
          itm.id,
          req.id,
          itm.itemId || null,
          itm.itemCode,
          itm.itemName,
          itm.category ? mapCategoryToId(itm.category) : null,
          itm.size || null,
          itm.color || null,
          itm.unit,
          itm.currentStock || 0,
          itm.requestedQty,
          itm.approvedQty || 0,
          itm.estimatedUnitPrice || 0,
          itm.totalEstimated || 0,
          itm.note || null
        );
      }
    }

    // 14. Nạp Chăm Sóc Khách Hàng CRM (customer_care_logs & care_reminders)
    console.log('  ❤️ Đang nạp chăm sóc khách hàng & nhắc hẹn CRM (customer_care_logs & reminders)...');
    const insertCareLog = db.prepare(`
      INSERT INTO customer_care_logs (
        id, date, partner_id, staff_id, channel, purpose, height_cm, weight_kg,
        bust_cm, waist_cm, hips_cm, body_shape, recommended_size, style_preferences,
        style_notes, customer_feedback, action_taken, next_appointment_date,
        status, priority, satisfaction_rating, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const care of INITIAL_CARE_LOGS) {
      const bc = care.bodyConsultation || {};
      insertCareLog.run(
        care.id,
        care.date,
        care.partnerId,
        care.staffId,
        care.channel,
        care.purpose,
        bc.heightCm || null,
        bc.weightKg || null,
        bc.bustCm || null,
        bc.waistCm || null,
        bc.hipsCm || null,
        bc.bodyShape || null,
        bc.recommendedSize || null,
        bc.stylePreferences ? JSON.stringify(bc.stylePreferences) : null,
        bc.styleNotes || null,
        care.customerFeedback || null,
        care.actionTaken,
        care.nextAppointmentDate || null,
        care.status,
        care.priority,
        care.satisfactionRating || null,
        care.notes || null
      );
    }

    const insertReminder = db.prepare(`
      INSERT INTO care_reminders (
        id, type, title, description, partner_id, due_date, status, voucher_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const rem of INITIAL_CARE_REMINDERS) {
      insertReminder.run(
        rem.id,
        rem.type,
        rem.title,
        rem.description,
        rem.partnerId,
        rem.dueDate,
        rem.status,
        rem.voucherCode || null
      );
    }
  });

  seedTransaction();
  console.log('✅ Hoàn tất nạp dữ liệu mẫu vào SQLite thành công!');
}

// Nếu chạy trực tiếp file từ dòng lệnh: tsx src/db/seed.ts
if (process.argv[1]?.includes('seed')) {
  try {
    runSeed(true);
  } catch (error) {
    console.error('❌ Lỗi khi chạy seed dữ liệu:', error);
    process.exit(1);
  }
}

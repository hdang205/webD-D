import db from '../../db/database.js';

db.prepare("DELETE FROM cash_transactions WHERE code LIKE 'PTN-%' OR code LIKE 'BNN-%'").run();
db.prepare("UPDATE invoices SET paid_amount = 0, status = 'UNPAID' WHERE code = 'HD-20260922-0005'").run();
db.prepare("UPDATE invoices SET paid_amount = 0, status = 'UNPAID' WHERE code IN ('HDM-HADONG-01', 'HDM450', 'HDM853')").run();

const cust: any = db.prepare(`
  SELECT p.code, p.name,
    (
      COALESCE(p.opening_debt_debit, 0) - COALESCE(p.opening_debt_credit, 0) +
      COALESCE((SELECT SUM(grand_total - paid_amount) FROM invoices WHERE partner_id = p.id AND status != 'CANCELLED' AND type = 'SALES'), 0) -
      COALESCE((SELECT SUM(amount) FROM cash_transactions WHERE partner_id = p.id AND category = 'CUSTOMER_DEBT_COLLECTION' AND invoice_id IS NULL), 0)
    ) as current_debt
  FROM partners p
  WHERE p.code = 'KH956591'
`).get();

console.log(`KH956591 current debt is reset to: ${cust?.current_debt?.toLocaleString('vi-VN')} ₫`);
process.exit(0);

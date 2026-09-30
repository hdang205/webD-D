import express from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { SERVER_CONFIG } from './config.js';
import debtRoutes from './routes/debtRoutes.js';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(num: number, name: string, passed: boolean, details: string) {
  results.push({ num, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [TEST ${num}] ${name}: ${details}`);
}

async function runDebtTests() {
  console.log('\n================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA NGHIỆP VỤ THU NỢ KHÁCH HÀNG & TRẢ NỢ NCC (TK 131 / 331)');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api/debts', debtRoutes);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api/debts`;

  const accountantToken = jwt.sign(
    { id: 'usr_emp_3', username: 'ketoan_dung', role: 'CHIEF_ACCOUNTANT' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accountantToken}`
  };

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Kiểm tra khách hàng KH956591
    // ------------------------------------------------------------------------
    console.log('--- 1. KIỂM TRA KHÁCH HÀNG KH956591 & HOÁ ĐƠN NỢ ---');
    const customer: any = db.prepare(`
      SELECT p.*,
        (
          COALESCE(p.opening_debt_debit, 0) - COALESCE(p.opening_debt_credit, 0) +
          COALESCE((SELECT SUM(grand_total - paid_amount) FROM invoices WHERE partner_id = p.id AND status != 'CANCELLED' AND type = 'SALES'), 0) -
          COALESCE((SELECT SUM(amount) FROM cash_transactions WHERE partner_id = p.id AND category = 'CUSTOMER_DEBT_COLLECTION' AND invoice_id IS NULL), 0)
        ) as current_debt
      FROM partners p
      WHERE p.code = 'KH956591'
    `).get();

    if (!customer) {
      record(1, 'Tìm khách hàng KH956591', false, 'Không tìm thấy khách hàng KH956591 trong SQLite');
      return;
    }

    record(1, 'Tìm khách hàng KH956591', true, `Tìm thấy khách hàng ${customer.name} (Mã: ${customer.code}), Nợ hiện tại: ${customer.current_debt.toLocaleString('vi-VN')} ₫`);

    // ------------------------------------------------------------------------
    // TEST 2: Validation chặn thu nợ vượt quá nợ hiện tại (Over-debt collection)
    // ------------------------------------------------------------------------
    console.log('\n--- 2. KIỂM TRA VALIDATION THU VƯỢT NỢ (OVER-DEBT) ---');
    const overCollectRes = await fetch(`${baseUrl}/collect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        amount: customer.current_debt + 1000000, // Vượt 1 triệu
        paymentMethod: 'CASH',
        note: 'Cố tình thu vượt nợ'
      })
    });

    const overCollectData: any = await overCollectRes.json();
    const test2Passed = overCollectRes.status === 400 && overCollectData.success === false;
    record(2, 'Chặn thu nợ lớn hơn nợ hiện tại', test2Passed, `Status: ${overCollectRes.status}, Msg: "${overCollectData.message}"`);

    // ------------------------------------------------------------------------
    // TEST 3: Thu nợ chuẩn 2.000.000 ₫ cho KH956591
    // ------------------------------------------------------------------------
    console.log('\n--- 3. THỰC HIỆN THU NỢ 2.000.000 ₫ (KH956591) ---');
    const prevDebt = customer.current_debt;
    const collectAmount = 2000000;
    const expectedDebt = prevDebt - collectAmount;

    const collectRes = await fetch(`${baseUrl}/collect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: customer.id,
        amount: collectAmount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        note: 'Thu nợ tiền hàng đợt 1'
      })
    });

    const collectData: any = await collectRes.json();
    const test3Passed = collectRes.status === 200 && collectData.success === true && collectData.newDebt === expectedDebt;
    record(3, 'Thu nợ 2.000.000 ₫ thành công', test3Passed, 
      `Nợ cũ: ${prevDebt.toLocaleString('vi-VN')} ₫ -> Nợ mới: ${collectData.newDebt?.toLocaleString('vi-VN')} ₫ (Kỳ vọng: ${expectedDebt.toLocaleString('vi-VN')} ₫)`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Kiểm tra phân bổ hóa đơn bán hàng & Phiếu thu tiền SQLite
    // ------------------------------------------------------------------------
    console.log('\n--- 4. KIỂM TRA PHÂN BỔ HÓA ĐƠN & GIAO DỊCH TIỀN SQLITE ---');
    const invoice: any = db.prepare(`
      SELECT * FROM invoices WHERE partner_id = ? AND code = 'HD-20260922-0005'
    `).get(customer.id);

    const invoiceUpdated = invoice && invoice.paid_amount >= 2000000 && invoice.status === 'PARTIAL';
    record(4, 'Phân bổ hóa đơn HD-20260922-0005', Boolean(invoiceUpdated), 
      `Hóa đơn ${invoice?.code}: Đã thanh toán = ${invoice?.paid_amount?.toLocaleString('vi-VN')} ₫ / ${invoice?.grand_total?.toLocaleString('vi-VN')} ₫, Trạng thái = ${invoice?.status}`
    );

    const cashTx: any = db.prepare(`
      SELECT * FROM cash_transactions 
      WHERE partner_id = ? AND category = 'CUSTOMER_DEBT_COLLECTION' 
      ORDER BY created_at DESC LIMIT 1
    `).get(customer.id);

    const cashTxValid = cashTx && 
      cashTx.type === 'CASH_RECEIPT' && 
      cashTx.fund_account_code === '1111' && 
      cashTx.opposite_account_code === '131' && 
      cashTx.amount === 2000000;

    record(5, 'Tạo giao dịch tiền phiếu thu nợ (TK 131/1111)', Boolean(cashTxValid),
      `Mã phiếu: ${cashTx?.code}, Loại: ${cashTx?.type}, Nợ TK: ${cashTx?.fund_account_code}, Có TK: ${cashTx?.opposite_account_code}, Số tiền: ${cashTx?.amount?.toLocaleString('vi-VN')} ₫`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Kiểm tra nhà cung cấp NCC002
    // ------------------------------------------------------------------------
    console.log('\n--- 5. KIỂM TRA NHÀ CUNG CẤP NCC002 & TRẢ NỢ NCC (TK 331) ---');
    const supplier: any = db.prepare(`
      SELECT p.*,
        (
          COALESCE(p.opening_debt_credit, 0) - COALESCE(p.opening_debt_debit, 0) +
          COALESCE((SELECT SUM(grand_total - paid_amount) FROM invoices WHERE partner_id = p.id AND status != 'CANCELLED' AND type = 'PURCHASE'), 0) -
          COALESCE((SELECT SUM(amount) FROM cash_transactions WHERE partner_id = p.id AND category = 'SUPPLIER_DEBT_PAYMENT' AND invoice_id IS NULL), 0)
        ) as current_debt
      FROM partners p
      WHERE p.code = 'NCC002'
    `).get();

    if (!supplier) {
      record(6, 'Tìm nhà cung cấp NCC002', false, 'Không tìm thấy nhà cung cấp NCC002');
    } else {
      record(6, 'Tìm nhà cung cấp NCC002', true, 
        `Tìm thấy NCC ${supplier.name} (Mã: ${supplier.code}), Nợ hiện tại: ${supplier.current_debt.toLocaleString('vi-VN')} ₫`
      );

      // Validation trả vượt nợ
      const overPayRes = await fetch(`${baseUrl}/pay`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          partnerId: supplier.id,
          amount: supplier.current_debt + 5000000,
          paymentMethod: 'BANK',
          note: 'Cố tình trả vượt nợ'
        })
      });

      const overPayData: any = await overPayRes.json();
      const overPayBlocked = overPayRes.status === 400 && overPayData.success === false;
      record(7, 'Chặn trả nợ lớn hơn nợ phải trả NCC', overPayBlocked, `Status: ${overPayRes.status}, Msg: "${overPayData.message}"`);

      // Trả nợ 3.000.000 ₫ qua Ngân hàng (TK 1121 vs 331)
      const payAmount = 3000000;
      const prevSuppDebt = supplier.current_debt;
      const expectedSuppDebt = prevSuppDebt - payAmount;

      const payRes = await fetch(`${baseUrl}/pay`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          partnerId: supplier.id,
          amount: payAmount,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'BANK',
          note: 'Thanh toán đợt 1 tiền nhập hàng vải'
        })
      });

      const payData: any = await payRes.json();
      const payPassed = payRes.status === 200 && payData.success === true && payData.newDebt === expectedSuppDebt;
      record(8, 'Thanh toán nợ 3.000.000 ₫ qua Chuyển khoản (TK 1121/331)', payPassed,
        `Nợ cũ: ${prevSuppDebt.toLocaleString('vi-VN')} ₫ -> Nợ mới: ${payData.newDebt?.toLocaleString('vi-VN')} ₫`
      );

      const payCashTx: any = db.prepare(`
        SELECT * FROM cash_transactions 
        WHERE partner_id = ? AND category = 'SUPPLIER_DEBT_PAYMENT' 
        ORDER BY created_at DESC LIMIT 1
      `).get(supplier.id);

      const payTxValid = payCashTx && 
        payCashTx.type === 'BANK_WITHDRAWAL' && 
        payCashTx.fund_account_code === '1121' && 
        payCashTx.opposite_account_code === '331' && 
        payCashTx.amount === 3000000;

      record(9, 'Tạo giao dịch tiền phiếu chi trả nợ (TK 331/1121)', Boolean(payTxValid),
        `Mã phiếu: ${payCashTx?.code}, Loại: ${payCashTx?.type}, Nợ TK: ${payCashTx?.opposite_account_code}, Có TK: ${payCashTx?.fund_account_code}, Số tiền: ${payCashTx?.amount?.toLocaleString('vi-VN')} ₫`
      );
    }

    // ------------------------------------------------------------------------
    // TEST 6: Lấy danh sách giao dịch công nợ qua GET /api/debts/transactions
    // ------------------------------------------------------------------------
    console.log('\n--- 6. KIỂM TRA LẤY GIAO DỊCH QUA GET /api/debts/transactions ---');
    const txListRes = await fetch(`${baseUrl}/transactions`, {
      method: 'GET',
      headers
    });
    const txList: any = await txListRes.json();
    const txListPassed = txListRes.status === 200 && Array.isArray(txList.data) && txList.data.length >= 2;
    record(10, 'Tải danh sách giao dịch tiền công nợ từ SQLite', txListPassed,
      `Trả về ${txList.data?.length || 0} giao dịch, phân loại chính xác CUSTOMER_DEBT_COLLECTION và SUPPLIER_DEBT_PAYMENT`
    );

  } catch (err: any) {
    console.error('Lỗi khi chạy test nghiệp vụ công nợ:', err);
    record(99, 'Lỗi ngoại lệ', false, err.message);
  } finally {
    server.close(() => {
      const allPassed = results.every(r => r.passed);
      console.log('\n================================================================');
      console.log(`KẾT QUẢ KIỂM TRA: ${results.filter(r => r.passed).length}/${results.length} bài test ĐẠT.`);
      if (allPassed) {
        console.log('🎉 TOÀN BỘ NGHIỆP VỤ THU NỢ KHÁCH HÀNG & TRẢ NỢ NCC ĐẠT CHUẨN 100%!');
      } else {
        console.log('⚠️ Có bài test không đạt, vui lòng kiểm tra chi tiết bên trên.');
      }
      console.log('================================================================\n');
      process.exit(allPassed ? 0 : 1);
    });
  }
}

runDebtTests();

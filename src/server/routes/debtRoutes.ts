import { Router } from 'express';
import { 
  collectDebt, 
  payDebt, 
  getDebtTransactions,
  createCashTransaction,
  deleteCashTransaction
} from '../controllers/debtController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Yêu cầu xác thực JWT cho toàn bộ nghiệp vụ công nợ
router.use(authenticateToken);

// Thu nợ khách hàng (Giám đốc, Kế toán trưởng, Thu ngân POS, Nhân viên bán hàng)
router.post(
  '/collect', 
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'SALES_CASHIER', 'SALES_STAFF'), 
  collectDebt
);

// Trả nợ nhà cung cấp (Giám đốc, Kế toán trưởng, Nhân viên mua hàng)
router.post(
  '/pay', 
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'PURCHASING_STAFF'), 
  payDebt
);

// Lấy danh sách giao dịch sổ quỹ từ SQLite
router.get('/transactions', getDebtTransactions);

// Tạo mới phiếu thu / phiếu chi sổ quỹ (Giám đốc, Kế toán trưởng, Thu ngân, Nhân viên)
router.post(
  '/transactions',
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'SALES_CASHIER', 'STAFF'),
  createCashTransaction
);

// Xóa phiếu thu / chi sổ quỹ (Giám đốc, Kế toán trưởng)
router.delete(
  '/transactions/:id',
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'),
  deleteCashTransaction
);

export default router;

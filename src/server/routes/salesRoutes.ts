import { Router } from 'express';
import { 
  getSales, 
  getSaleById, 
  createSale, 
  addSalePayment,
  deleteSale
} from '../controllers/salesController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Yêu cầu xác thực JWT Token cho mọi thao tác bán hàng
router.use(authenticateToken);

// Đọc danh sách và chi tiết hóa đơn bán hàng
router.get('/', getSales);
router.get('/:id', getSaleById);

// Tạo mới hóa đơn bán hàng (Giám đốc, Kế toán trưởng, Thu ngân, Nhân viên bán hàng)
router.post(
  '/', 
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'SALES_CASHIER', 'SALES_STAFF'), 
  createSale
);

// Thu tiền / thanh toán công nợ hóa đơn bán hàng (Giám đốc, Kế toán trưởng, Thu ngân)
router.post(
  '/:id/payments', 
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'SALES_CASHIER'), 
  addSalePayment
);

// Xóa hóa đơn bán hàng (Giám đốc, Kế toán trưởng)
router.delete(
  '/:id',
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'),
  deleteSale
);

export default router;

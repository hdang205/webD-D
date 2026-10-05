import { Router } from 'express';
import { 
  getPurchases, 
  getPurchaseById, 
  createPurchase, 
  addPurchasePayment,
  deletePurchase
} from '../controllers/purchaseController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Yêu cầu xác thực phiên đăng nhập
router.use(authenticateToken);

// Đọc danh sách và chi tiết đơn mua hàng
router.get('/', getPurchases);
router.get('/:id', getPurchaseById);

// Lập đơn mua hàng / nhập hàng xưởng may (Giám đốc, Kế toán trưởng, Quản lý kho, Nhân viên mua hàng)
router.post(
  '/', 
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER', 'PURCHASING_STAFF'), 
  createPurchase
);

// Thanh toán công nợ đơn nhập hàng (Giám đốc, Kế toán trưởng)
router.post(
  '/:id/payments', 
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'), 
  addPurchasePayment
);

// Xóa hóa đơn mua hàng (Giám đốc, Kế toán trưởng)
router.delete(
  '/:id',
  requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'),
  deletePurchase
);

export default router;

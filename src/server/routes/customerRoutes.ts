import { Router } from 'express';
import { 
  getCustomers, 
  getPartnerById, 
  createCustomer, 
  updatePartner, 
  deletePartner 
} from '../controllers/partnerController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Yêu cầu đăng nhập
router.use(authenticateToken);

// Đọc danh sách và chi tiết khách hàng
router.get('/', getCustomers);
router.get('/:id', getPartnerById);

// Thêm / Cập nhật khách hàng (cho phép Giám đốc, Kế toán, Thu ngân POS, Nhân viên bán hàng)
router.post('/', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'SALES_STAFF', 'SALES_CASHIER'), createCustomer);
router.put('/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'SALES_STAFF', 'SALES_CASHIER'), updatePartner);

// Xóa khách hàng (chỉ dành cho Giám đốc hoặc Kế toán trưởng)
router.delete('/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'), deletePartner);

export default router;

import { Router } from 'express';
import { 
  getSuppliers, 
  getPartnerById, 
  createSupplier, 
  updatePartner, 
  deletePartner,
  getSupplierProducts,
  linkSupplierProduct
} from '../controllers/partnerController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Yêu cầu đăng nhập
router.use(authenticateToken);

// Đọc danh sách và chi tiết nhà cung cấp
router.get('/', getSuppliers);
router.get('/:id', getPartnerById);
router.get('/:id/products', getSupplierProducts);

// Thao tác chỉnh sửa NCC: Yêu cầu Giám Đốc, Kế Toán Trưởng hoặc Nhân Viên Mua Hàng
router.post('/', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'PURCHASING_STAFF'), createSupplier);
router.post('/:id/products', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER', 'PURCHASING_STAFF'), linkSupplierProduct);
router.put('/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'PURCHASING_STAFF'), updatePartner);

// Xóa nhà cung cấp: Chỉ dành cho Giám đốc hoặc Kế toán trưởng
router.delete('/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'), deletePartner);

export default router;

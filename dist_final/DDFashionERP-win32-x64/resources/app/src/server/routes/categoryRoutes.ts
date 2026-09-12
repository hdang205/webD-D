import { Router } from 'express';
import { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/categoryController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Tất cả API danh mục yêu cầu đăng nhập
router.use(authenticateToken);

// Đọc danh mục (tất cả các vai trò hợp lệ được phép xem)
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Thao tác chỉnh sửa (yêu cầu quyền Giám Đốc, Kế Toán Trưởng hoặc Quản Lý Kho)
router.post('/', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'), createCategory);
router.put('/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'), updateCategory);
router.delete('/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'), deleteCategory);

export default router;

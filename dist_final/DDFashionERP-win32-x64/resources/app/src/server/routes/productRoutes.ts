import { Router } from 'express';
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/productController.js';
import { importProductsFromExcel } from '../controllers/productImportController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Yêu cầu xác thực phiên đăng nhập
router.use(authenticateToken);

// Đọc danh sách và chi tiết sản phẩm
router.get('/', getProducts);
router.get('/:id', getProductById);

// Import danh mục sản phẩm từ Excel (Yêu cầu Giám Đốc, Quản Lý Kho hoặc Kế Toán Trưởng)
router.post('/import', requireRole('DIRECTOR', 'WAREHOUSE_MANAGER', 'CHIEF_ACCOUNTANT'), importProductsFromExcel);

// Thao tác chỉnh sửa sản phẩm: Yêu cầu Giám Đốc, Quản Lý Kho hoặc Kế Toán Trưởng
router.post('/', requireRole('DIRECTOR', 'WAREHOUSE_MANAGER', 'CHIEF_ACCOUNTANT'), createProduct);
router.put('/:id', requireRole('DIRECTOR', 'WAREHOUSE_MANAGER', 'CHIEF_ACCOUNTANT'), updateProduct);
router.delete('/:id', requireRole('DIRECTOR', 'WAREHOUSE_MANAGER', 'CHIEF_ACCOUNTANT'), deleteProduct);

export default router;

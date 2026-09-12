import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { 
  getInventory,
  getInventoryItemById,
  getInventoryLogs, 
  adjustInventory,
  initStock, 
  getInventorySummary 
} from '../controllers/inventoryController.js';

const router = Router();

// Tất cả endpoints đều yêu cầu xác thực JWT
router.use(authenticateToken);

// GET /api/inventory - Danh sách tồn kho sản phẩm kèm bộ lọc (search, category, status)
router.get('/', getInventory);

// GET /api/inventory/summary - Thống kê tổng quan kho hàng
router.get('/summary', getInventorySummary);

// GET /api/inventory/logs - Lịch sử chi tiết toàn bộ các lần nhập xuất kho
router.get('/logs', getInventoryLogs);

// POST /api/inventory/adjust - Điều chỉnh tăng/giảm số lượng tồn kho (Yêu cầu quyền: Quản lý kho, Kế toán trưởng, Giám đốc)
router.post('/adjust', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'), adjustInventory);

// POST /api/inventory/initial-stock - Khởi tạo tồn kho ban đầu (Giám đốc, Kế toán trưởng, Quản lý kho)
router.post('/initial-stock', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'), initStock);

// GET /api/inventory/:productId - Thông tin tồn kho & lịch sử biến động của 1 sản phẩm
router.get('/:productId', getInventoryItemById);

export default router;

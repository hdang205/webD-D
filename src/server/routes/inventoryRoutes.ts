import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { 
  getInventory,
  getInventoryItemById,
  getInventoryLogs, 
  adjustInventory,
  initStock, 
  getInventorySummary,
  getStockAudits,
  getStockAuditById,
  createStockAudit,
  getDefectiveGoods,
  recordDefectiveGoods,
  createStockVoucher,
  deleteStockVoucher
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

// PHIẾU XUẤT NHẬP KHO (STOCK VOUCHERS)
// POST /api/inventory/vouchers - Tạo phiếu nhập/xuất kho
router.post('/vouchers', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER', 'STAFF'), createStockVoucher);
// DELETE /api/inventory/vouchers/:id - Xóa phiếu nhập/xuất kho
router.delete('/vouchers/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'), deleteStockVoucher);

// KIỂM KHO (STOCK AUDITS)
// GET /api/inventory/audits - Danh sách toàn bộ các phiếu kiểm kho
router.get('/audits', getStockAudits);
// GET /api/inventory/audits/:id - Chi tiết một phiếu kiểm kho
router.get('/audits/:id', getStockAuditById);
// POST /api/inventory/audits - Tạo & xác nhận phiếu kiểm kho
router.post('/audits', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER', 'STAFF'), createStockAudit);

// QUẢN LÝ HÀNG LỖI (DEFECTIVE GOODS)
// GET /api/inventory/defects - Danh sách sản phẩm lỗi
router.get('/defects', getDefectiveGoods);
// POST /api/inventory/defects - Khai báo & xử lý sản phẩm lỗi
router.post('/defects', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER', 'STAFF'), recordDefectiveGoods);

// POST /api/inventory/adjust - Điều chỉnh tăng/giảm số lượng tồn kho (Yêu cầu quyền: Quản lý kho, Kế toán trưởng, Giám đốc)
router.post('/adjust', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'), adjustInventory);

// POST /api/inventory/initial-stock - Khởi tạo tồn kho ban đầu (Giám đốc, Kế toán trưởng, Quản lý kho)
router.post('/initial-stock', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'), initStock);

// GET /api/inventory/:productId - Thông tin tồn kho & lịch sử biến động của 1 sản phẩm
router.get('/:productId', getInventoryItemById);

export default router;

import { Response } from 'express';
import db from '../../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { applyInitialStock } from '../services/initialStockService.js';
import { handleDbError } from '../utils/dbErrors.js';

/**
 * Lấy danh sách tồn kho sản phẩm kèm bộ lọc & trạng thái
 * GET /api/inventory?search=...&category=...&status=...
 */
export function getInventory(req: AuthenticatedRequest, res: Response): void {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    let sql = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.unit,
        p.category_id as categoryId,
        c.name as category,
        c.code as categoryCode,
        p.size,
        p.color,
        p.barcode,
        p.image_url as imageUrl,
        p.cost_price as costPrice,
        p.selling_price as sellingPrice,
        p.current_stock as currentStock,
        p.current_stock as openingQuantity,
        (p.current_stock * p.cost_price) as inventoryValue,
        p.min_stock_level as minStockLevel,
        p.description,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ? OR c.name LIKE ?) `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (category && category !== 'ALL') {
      sql += ` AND (p.category_id = ? OR c.name = ? OR c.code = ?) `;
      params.push(category, category, category);
    }

    if (status === 'OUT_OF_STOCK' || status === 'OUT') {
      sql += ` AND p.current_stock = 0 `;
    } else if (status === 'LOW_STOCK' || status === 'LOW') {
      sql += ` AND p.current_stock <= p.min_stock_level AND p.current_stock > 0 `;
    } else if (status === 'IN_STOCK') {
      sql += ` AND p.current_stock > p.min_stock_level `;
    }

    sql += ` ORDER BY p.code ASC `;

    const rows = db.prepare(sql).all(...params) as any[];

    const result = rows.map(item => {
      const stock = Number(item.currentStock) || 0;
      const minStock = Number(item.minStockLevel) || 5;
      let stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
      let statusText: string;

      if (stock === 0) {
        stockStatus = 'OUT_OF_STOCK';
        statusText = 'Hết hàng';
      } else if (stock <= minStock) {
        stockStatus = 'LOW_STOCK';
        statusText = 'Sắp hết';
      } else {
        stockStatus = 'IN_STOCK';
        statusText = 'Còn hàng';
      }

      return {
        ...item,
        currentStock: stock,
        openingQuantity: stock,
        inventoryValue: stock * (Number(item.costPrice) || 0),
        status: stockStatus,
        statusText
      };
    });

    res.json(result);
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi lấy danh sách tồn kho sản phẩm');
  }
}

/**
 * Lấy thông tin tồn kho chi tiết và lịch sử biến động của 1 sản phẩm
 * GET /api/inventory/:productId
 */
export function getInventoryItemById(req: AuthenticatedRequest, res: Response): void {
  try {
    const { productId } = req.params;

    const product = db.prepare(`
      SELECT 
        p.id,
        p.code,
        p.name,
        p.unit,
        p.category_id as categoryId,
        c.name as category,
        c.code as categoryCode,
        p.size,
        p.color,
        p.barcode,
        p.image_url as imageUrl,
        p.cost_price as costPrice,
        p.selling_price as sellingPrice,
        p.current_stock as currentStock,
        (p.current_stock * p.cost_price) as inventoryValue,
        p.min_stock_level as minStockLevel,
        p.description,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ? OR p.code = ?
    `).get(productId, productId) as any;

    if (!product) {
      res.status(404).json({ success: false, error: `Không tìm thấy sản phẩm '${productId}'` });
      return;
    }

    const stock = Number(product.currentStock) || 0;
    const minStock = Number(product.minStockLevel) || 5;
    let stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
    let statusText: string;

    if (stock === 0) {
      stockStatus = 'OUT_OF_STOCK';
      statusText = 'Hết hàng';
    } else if (stock <= minStock) {
      stockStatus = 'LOW_STOCK';
      statusText = 'Sắp hết';
    } else {
      stockStatus = 'IN_STOCK';
      statusText = 'Còn hàng';
    }

    // Lấy biến động của sản phẩm này theo thời gian từ cũ đến mới để tính tồn trước/sau
    const movements = db.prepare(`
      SELECT 
        ili.id,
        ili.movement_type as movementType,
        ili.quantity,
        ili.unit_price as unitPrice,
        ili.total_amount as totalAmount,
        il.id as logId,
        il.code as logCode,
        il.date,
        il.type as logType,
        il.invoice_ref as invoiceRef,
        il.invoice_id as invoiceId,
        il.deliverer_or_receiver as delivererOrReceiver,
        il.partner_name as partnerName,
        il.note,
        il.created_at as createdAt,
        u.name as createdByName,
        inv.type as invoiceType
      FROM inventory_log_items ili
      JOIN inventory_logs il ON il.id = ili.inventory_log_id
      LEFT JOIN users u ON u.id = il.created_by
      LEFT JOIN invoices inv ON inv.id = il.invoice_id
      WHERE ili.product_id = ?
      ORDER BY il.date ASC, il.created_at ASC, ili.id ASC
    `).all(product.id) as any[];

    let runningStock = 0;
    const historyWithStock = movements.map(m => {
      const isImport = m.movementType === 'IMPORT';
      const qty = Number(m.quantity) || 0;
      const stockBefore = runningStock;
      const stockAfter = isImport ? stockBefore + qty : Math.max(0, stockBefore - qty);
      runningStock = stockAfter;

      let transactionType = 'OTHER';
      if (m.invoiceRef === 'INITIAL_STOCK' || (m.note && m.note.toLowerCase().includes('ban đầu'))) {
        transactionType = 'INITIAL_STOCK';
      } else if (m.invoiceType === 'PURCHASE' || m.logCode?.startsWith('PNK') || (m.note && m.note.includes('hóa đơn mua'))) {
        transactionType = 'PURCHASE';
      } else if (m.invoiceType === 'SALES' || m.logCode?.startsWith('PXK') || (m.note && m.note.toLowerCase().includes('bán'))) {
        transactionType = 'SALE';
      } else if (m.invoiceRef === 'ADJUSTMENT' || m.logCode?.startsWith('DC') || (m.note && m.note.includes('ADJUSTMENT'))) {
        transactionType = 'ADJUSTMENT';
      } else {
        transactionType = m.movementType;
      }

      return {
        id: m.id,
        logId: m.logId,
        logCode: m.logCode,
        date: m.date,
        createdAt: m.createdAt,
        movementType: m.movementType,
        transactionType,
        quantity: qty,
        unitPrice: m.unitPrice,
        totalAmount: m.totalAmount,
        stockBefore,
        stockAfter,
        operator: m.createdByName || 'Hệ thống',
        reference: m.invoiceRef || m.logCode,
        note: m.note
      };
    });

    // Trả về lịch sử theo thứ tự mới nhất trước
    historyWithStock.reverse();

    res.json({
      success: true,
      product: {
        ...product,
        currentStock: stock,
        status: stockStatus,
        statusText
      },
      history: historyWithStock
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi lấy chi tiết tồn kho sản phẩm');
  }
}

/**
 * Lấy lịch sử toàn bộ các lần nhập xuất kho kèm tồn trước và tồn sau
 * GET /api/inventory/logs
 */
export function getInventoryLogs(req: AuthenticatedRequest, res: Response): void {
  try {
    // 1. Lấy tất cả các dòng xuất nhập kho theo trình tự thời gian tăng dần để tính running balance
    const rawItems = db.prepare(`
      SELECT 
        ili.id,
        ili.inventory_log_id as inventoryLogId,
        ili.product_id as productId,
        ili.movement_type as movementType,
        ili.item_code as itemCode,
        ili.item_name as itemName,
        ili.unit,
        ili.quantity,
        ili.unit_price as unitPrice,
        ili.total_amount as totalAmount,
        il.id as logId,
        il.code as logCode,
        il.date,
        il.type as logType,
        il.invoice_ref as invoiceRef,
        il.invoice_id as invoiceId,
        il.partner_id as partnerId,
        il.partner_name as partnerName,
        il.deliverer_or_receiver as delivererOrReceiver,
        il.warehouse_name as warehouseName,
        il.note,
        il.created_by as createdBy,
        il.created_at as createdAt,
        u.name as createdByName,
        inv.type as invoiceType
      FROM inventory_log_items ili
      JOIN inventory_logs il ON il.id = ili.inventory_log_id
      LEFT JOIN users u ON u.id = il.created_by
      LEFT JOIN invoices inv ON inv.id = il.invoice_id
      ORDER BY il.date ASC, il.created_at ASC, ili.id ASC
    `).all() as any[];

    // Tính running balance chính xác cho từng sản phẩm
    const productStockMap = new Map<string, number>();

    const itemsWithBalance = rawItems.map(item => {
      const prodId = item.productId;
      const currentBalance = productStockMap.get(prodId) || 0;
      const qty = Number(item.quantity) || 0;
      const isImport = item.movementType === 'IMPORT';

      const stockBefore = currentBalance;
      const stockAfter = isImport ? stockBefore + qty : Math.max(0, stockBefore - qty);
      productStockMap.set(prodId, stockAfter);

      let transactionType = 'OTHER';
      if (item.invoiceRef === 'INITIAL_STOCK' || (item.note && item.note.toLowerCase().includes('ban đầu'))) {
        transactionType = 'INITIAL_STOCK';
      } else if (item.invoiceType === 'PURCHASE' || item.logCode?.startsWith('PNK') || (item.note && item.note.includes('hóa đơn mua'))) {
        transactionType = 'PURCHASE';
      } else if (item.invoiceType === 'SALES' || item.logCode?.startsWith('PXK') || (item.note && item.note.toLowerCase().includes('bán'))) {
        transactionType = 'SALE';
      } else if (item.invoiceRef === 'ADJUSTMENT' || item.logCode?.startsWith('DC') || (item.note && item.note.includes('ADJUSTMENT'))) {
        transactionType = 'ADJUSTMENT';
      } else {
        transactionType = item.movementType;
      }

      return {
        id: item.id,
        inventoryLogId: item.inventoryLogId,
        productId: item.productId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        movementType: item.movementType,
        transactionType,
        quantity: qty,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
        stockBefore,
        stockAfter,
        logCode: item.logCode,
        date: item.date,
        createdAt: item.createdAt,
        invoiceRef: item.invoiceRef,
        partnerName: item.partnerName,
        delivererOrReceiver: item.delivererOrReceiver,
        warehouseName: item.warehouseName,
        operator: item.createdByName || item.createdBy || 'Hệ thống',
        note: item.note
      };
    });

    // Sắp xếp lại danh sách theo thời gian mới nhất lên đầu
    itemsWithBalance.reverse();

    // Đồng thời cũng trả về cấu trúc phiếu kho nhóm theo logs để tương thích với các view cũ
    const logs = db.prepare(`
      SELECT 
        il.id,
        il.code,
        il.date,
        il.type,
        il.invoice_ref as invoiceRef,
        il.invoice_id as invoiceId,
        il.partner_id as partnerId,
        il.partner_name as partnerName,
        il.deliverer_or_receiver as delivererOrReceiver,
        il.warehouse_name as warehouseName,
        il.stock_account_code as stockAccountCode,
        il.opposite_account_code as oppositeAccountCode,
        il.total_value as totalValue,
        il.note,
        il.created_by as createdBy,
        il.created_at as createdAt,
        u.name as createdByName
      FROM inventory_logs il
      LEFT JOIN users u ON u.id = il.created_by
      ORDER BY il.date DESC, il.created_at DESC
    `).all() as any[];

    const getItemsStmt = db.prepare(`
      SELECT 
        ili.id,
        ili.inventory_log_id as inventoryLogId,
        ili.product_id as productId,
        ili.movement_type as movementType,
        ili.item_code as itemCode,
        ili.item_name as itemName,
        ili.unit,
        ili.quantity,
        ili.unit_price as unitPrice,
        ili.total_amount as totalAmount
      FROM inventory_log_items ili
      WHERE ili.inventory_log_id = ?
    `);

    const logGroups = logs.map(log => ({
      ...log,
      items: getItemsStmt.all(log.id)
    }));

    res.json({
      success: true,
      movements: itemsWithBalance,
      logs: logGroups
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi lấy danh sách phiếu kho');
  }
}

/**
 * Điều chỉnh số lượng tồn kho (+ hoặc -) có kiểm soát và ghi log
 * POST /api/inventory/adjust
 */
export function adjustInventory(req: AuthenticatedRequest, res: Response): void {
  try {
    const { productId, quantity, delta, reason, note } = req.body;

    // 1. Kiểm tra quyền hạn
    const userRole = req.user?.role;
    if (userRole !== 'DIRECTOR' && userRole !== 'CHIEF_ACCOUNTANT' && userRole !== 'WAREHOUSE_MANAGER') {
      res.status(403).json({
        success: false,
        error: 'Tài khoản không có quyền điều chỉnh tồn kho. Chỉ Quản lý kho, Kế toán trưởng hoặc Giám đốc mới có quyền này.'
      });
      return;
    }

    // 2. Validate đầu vào
    if (!productId) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng chọn sản phẩm cần điều chỉnh.'
      });
      return;
    }

    const effectiveDelta = Number(delta !== undefined ? delta : quantity);
    if (isNaN(effectiveDelta) || effectiveDelta === 0 || !Number.isInteger(effectiveDelta)) {
      res.status(400).json({
        success: false,
        error: 'Số lượng điều chỉnh phải là số nguyên khác 0 (dương để tăng, âm để giảm).'
      });
      return;
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim() : (typeof note === 'string' ? note.trim() : '');
    if (!trimmedReason) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng nhập lý do điều chỉnh tồn kho (ví dụ: Hàng lỗi, Kiểm kê định kỳ, Hàng mẫu...).'
      });
      return;
    }

    // 3. Tra cứu sản phẩm trong DB
    const product = db.prepare(`
      SELECT id, code, name, unit, cost_price, current_stock 
      FROM products 
      WHERE id = ? OR code = ?
    `).get(productId, productId) as any;

    if (!product) {
      res.status(404).json({
        success: false,
        error: `Sản phẩm '${productId}' không tồn tại trong hệ thống.`
      });
      return;
    }

    // 4. KIỂM SOÁT TỒN ÂM: Không cho điều chỉnh làm stock < 0
    if (effectiveDelta < 0 && Math.abs(effectiveDelta) > product.current_stock) {
      res.status(400).json({
        success: false,
        error: `Không thể điều chỉnh giảm ${Math.abs(effectiveDelta)} sản phẩm. Tồn kho hiện tại chỉ còn ${product.current_stock}.`
      });
      return;
    }

    const timestamp = Date.now();
    const dateCompact = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const today = new Date().toISOString().split('T')[0];

    const logId = `log_adj_${timestamp}_${randomSuffix.toLowerCase()}`;
    const logCode = `DC-${dateCompact}-${randomSuffix}`;
    const logItemId = `item_adj_${timestamp}_${randomSuffix.toLowerCase()}`;

    const isImport = effectiveDelta > 0;
    const movementType = isImport ? 'IMPORT' : 'EXPORT';
    const absQty = Math.abs(effectiveDelta);
    const lineTotal = absQty * product.cost_price;

    // 5. Thực thi Transaction Atomic: ghi log & trigger cập nhật tồn kho
    const transaction = db.transaction(() => {
      // Ghi phiếu kho (inventory_logs)
      const oppositeAccountCode = isImport ? '331' : '632';

      // Ghi phiếu kho (inventory_logs)
      db.prepare(`
        INSERT INTO inventory_logs (
          id, code, date, type, invoice_ref, warehouse_name,
          stock_account_code, opposite_account_code, total_value,
          note, created_by, created_at
        ) VALUES (
          @id, @code, @date, @type, 'ADJUSTMENT', 'Kho Tổng Thời Trang D&D',
          '156', @oppositeAccountCode, @totalValue,
          @note, @createdBy, datetime('now')
        )
      `).run({
        id: logId,
        code: logCode,
        date: today,
        type: movementType,
        oppositeAccountCode,
        totalValue: lineTotal,
        note: `ADJUSTMENT: ${trimmedReason}`,
        createdBy: req.user?.id || 'usr_emp_1'
      });

      // Ghi dòng chi tiết phiếu kho (inventory_log_items)
      // Chú ý: Trigger 'trg_inventory_log_item_after_insert' sẽ tự động cập nhật products.current_stock!
      db.prepare(`
        INSERT INTO inventory_log_items (
          id, inventory_log_id, product_id, movement_type, item_code,
          item_name, unit, quantity, unit_price, total_amount
        ) VALUES (
          @id, @logId, @productId, @movementType, @itemCode,
          @itemName, @unit, @quantity, @unitPrice, @totalAmount
        )
      `).run({
        id: logItemId,
        logId,
        productId: product.id,
        movementType,
        itemCode: product.code,
        itemName: product.name,
        unit: product.unit,
        quantity: absQty,
        unitPrice: product.cost_price,
        totalAmount: lineTotal
      });
    });

    transaction();

    // 6. Đọc tồn kho mới nhất từ Database
    const updatedProd = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(product.id) as any;
    const newStock = updatedProd?.current_stock;

    res.status(200).json({
      success: true,
      message: `Điều chỉnh tồn kho thành công cho sản phẩm ${product.name}`,
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        previousStock: product.current_stock,
        delta: effectiveDelta,
        currentStock: newStock
      },
      log: {
        id: logId,
        code: logCode,
        movementType,
        quantity: absQty,
        reason: trimmedReason
      }
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi điều chỉnh tồn kho');
  }
}

/**
 * Bổ sung tồn kho ban đầu cho các sản phẩm đang có tồn kho = 0 (Phase 4.1)
 * POST /api/inventory/initial-stock
 */
export function initStock(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user?.id || 'usr_emp_1';
    const result = applyInitialStock(userId);
    res.status(200).json(result);
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi khởi tạo tồn kho ban đầu');
  }
}

/**
 * Thống kê tổng hợp tồn kho toàn hệ thống
 * GET /api/inventory/summary
 */
export function getInventorySummary(req: AuthenticatedRequest, res: Response): void {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalProducts,
        COALESCE(SUM(current_stock), 0) as totalStockQuantity,
        COALESCE(SUM(current_stock * cost_price), 0) as totalInventoryValue,
        SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as zeroStockCount,
        SUM(CASE WHEN current_stock <= min_stock_level AND current_stock > 0 THEN 1 ELSE 0 END) as lowStockCount,
        SUM(CASE WHEN current_stock > min_stock_level THEN 1 ELSE 0 END) as inStockCount
      FROM products
    `).get() as any;

    res.json({
      success: true,
      summary: {
        totalProducts: stats.totalProducts || 0,
        totalSkus: stats.totalProducts || 0,
        totalStockQuantity: stats.totalStockQuantity || 0,
        totalInventoryValue: stats.totalInventoryValue || 0,
        zeroStockCount: stats.zeroStockCount || 0,
        outOfStockCount: stats.zeroStockCount || 0,
        lowStockCount: stats.lowStockCount || 0,
        inStockCount: stats.inStockCount || 0
      }
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi lấy thống kê tồn kho');
  }
}

// ============================================================================
// PHÂN HỆ KIỂM KHO (STOCK AUDITS)
// ============================================================================

/**
 * Lấy danh sách toàn bộ phiếu kiểm kho
 * GET /api/inventory/audits
 */
export function getStockAudits(req: AuthenticatedRequest, res: Response): void {
  try {
    const audits = db.prepare(`
      SELECT 
        id, code, date, auditor_name as auditorName, auditor_id as auditorId,
        reason, status, total_items as totalItems, total_diff as totalDiff,
        matched_count as matchedCount, shortage_count as shortageCount, surplus_count as surplusCount,
        note, created_at as createdAt
      FROM stock_audits
      ORDER BY date DESC, created_at DESC
    `).all() as any[];

    const getItemsStmt = db.prepare(`
      SELECT 
        id, audit_id as auditId, product_id as productId, item_code as itemCode,
        item_name as itemName, unit, system_stock as systemStock,
        actual_stock as actualStock, difference, status, cost_price as costPrice,
        difference_value as differenceValue, note
      FROM stock_audit_items
      WHERE audit_id = ?
      ORDER BY id ASC
    `);

    const result = audits.map(a => ({
      ...a,
      items: getItemsStmt.all(a.id)
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi lấy danh sách phiếu kiểm kho');
  }
}

/**
 * Lấy chi tiết một phiếu kiểm kho
 * GET /api/inventory/audits/:id
 */
export function getStockAuditById(req: AuthenticatedRequest, res: Response): void {
  try {
    const { id } = req.params;
    const audit = db.prepare(`
      SELECT 
        id, code, date, auditor_name as auditorName, auditor_id as auditorId,
        reason, status, total_items as totalItems, total_diff as totalDiff,
        matched_count as matchedCount, shortage_count as shortageCount, surplus_count as surplusCount,
        note, created_at as createdAt
      FROM stock_audits
      WHERE id = ? OR code = ?
    `).get(id, id) as any;

    if (!audit) {
      res.status(404).json({ success: false, error: `Không tìm thấy phiếu kiểm kho '${id}'` });
      return;
    }

    const items = db.prepare(`
      SELECT 
        id, audit_id as auditId, product_id as productId, item_code as itemCode,
        item_name as itemName, unit, system_stock as systemStock,
        actual_stock as actualStock, difference, status, cost_price as costPrice,
        difference_value as differenceValue, note
      FROM stock_audit_items
      WHERE audit_id = ?
      ORDER BY id ASC
    `).all(audit.id);

    res.json({
      success: true,
      data: {
        ...audit,
        items
      }
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi lấy chi tiết phiếu kiểm kho');
  }
}

/**
 * Tạo & xác nhận phiếu kiểm kho: Cập nhật tồn kho theo số lượng thực tế
 * POST /api/inventory/audits
 */
export function createStockAudit(req: AuthenticatedRequest, res: Response): void {
  try {
    const { items, reason, note, date, auditorName } = req.body;

    // 1. Validate danh sách sản phẩm
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Phiếu kiểm kho phải có ít nhất 1 sản phẩm kiểm đếm.'
      });
      return;
    }

    // 2. Validate lý do kiểm kê
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng nhập lý do kiểm kho (ví dụ: Kiểm kê định kỳ, Kiểm tra đột xuất).'
      });
      return;
    }

    const today = date || new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const dateCompact = today.replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const auditId = `audit_${timestamp}_${randomSuffix.toLowerCase()}`;
    const auditCode = `PKK-${dateCompact}-${randomSuffix}`;
    const actualAuditorName = auditorName?.trim() || req.user?.name || 'Nhân viên kiểm kho';
    const auditorId = req.user?.id || 'usr_emp_1';

    // 3. Xử lý & validate từng mặt hàng
    const validatedItems: any[] = [];
    let matchedCount = 0;
    let shortageCount = 0;
    let surplusCount = 0;
    let totalDiff = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const prodId = it.productId || it.id;

      if (!prodId) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Thiếu thông tin mã sản phẩm kiểm kê.`
        });
        return;
      }

      // Kiểm tra sản phẩm trong DB
      const product = db.prepare(`
        SELECT id, code, name, unit, cost_price, current_stock 
        FROM products 
        WHERE id = ? OR code = ?
      `).get(prodId, prodId) as any;

      if (!product) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1}: Sản phẩm '${prodId}' không tồn tại trong hệ thống.`
        });
        return;
      }

      // Validate số lượng thực tế: không được âm, phải là số nguyên
      const actualStock = Number(it.actualStock);
      if (isNaN(actualStock) || actualStock < 0 || !Number.isInteger(actualStock)) {
        res.status(400).json({
          success: false,
          error: `Dòng ${idx + 1} (${product.name}): Số lượng thực tế phải là số nguyên không âm (nhận được: ${it.actualStock}).`
        });
        return;
      }

      const systemStock = Number(product.current_stock);
      const difference = actualStock - systemStock;
      totalDiff += difference;

      let status: 'MATCH' | 'SHORTAGE' | 'SURPLUS';
      if (difference === 0) {
        status = 'MATCH';
        matchedCount++;
      } else if (difference < 0) {
        status = 'SHORTAGE';
        shortageCount++;
      } else {
        status = 'SURPLUS';
        surplusCount++;
      }

      const costPrice = Number(product.cost_price) || 0;
      const differenceValue = Math.abs(difference) * costPrice;

      validatedItems.push({
        product,
        systemStock,
        actualStock,
        difference,
        status,
        costPrice,
        differenceValue,
        note: it.note ? String(it.note).trim() : ''
      });
    }

    // 4. Thực thi Transaction Database Atomic
    const executeAudit = db.transaction(() => {
      // 4.1. Ghi bản ghi phiếu kiểm kho (stock_audits)
      db.prepare(`
        INSERT INTO stock_audits (
          id, code, date, auditor_name, auditor_id, reason,
          status, total_items, total_diff, matched_count, shortage_count, surplus_count,
          note, created_at
        ) VALUES (
          @id, @code, @date, @auditorName, @auditorId, @reason,
          'COMPLETED', @totalItems, @totalDiff, @matchedCount, @shortageCount, @surplusCount,
          @note, datetime('now')
        )
      `).run({
        id: auditId,
        code: auditCode,
        date: today,
        auditorName: actualAuditorName,
        auditorId,
        reason: trimmedReason,
        totalItems: validatedItems.length,
        totalDiff,
        matchedCount,
        shortageCount,
        surplusCount,
        note: note ? String(note).trim() : null
      });

      // 4.2. Ghi chi tiết từng dòng kiểm kê (stock_audit_items)
      const insertItemStmt = db.prepare(`
        INSERT INTO stock_audit_items (
          id, audit_id, product_id, item_code, item_name, unit,
          system_stock, actual_stock, difference, status,
          cost_price, difference_value, note
        ) VALUES (
          @id, @auditId, @productId, @itemCode, @itemName, @unit,
          @systemStock, @actualStock, @difference, @status,
          @costPrice, @differenceValue, @note
        )
      `);

      for (let i = 0; i < validatedItems.length; i++) {
        const it = validatedItems[i];
        insertItemStmt.run({
          id: `audit_item_${timestamp}_${i + 1}`,
          auditId,
          productId: it.product.id,
          itemCode: it.product.code,
          itemName: it.product.name,
          unit: it.product.unit,
          systemStock: it.systemStock,
          actualStock: it.actualStock,
          difference: it.difference,
          status: it.status,
          costPrice: it.costPrice,
          differenceValue: it.differenceValue,
          note: it.note
        });
      }

      // 4.3. Cân bằng tồn kho qua phiếu điều chỉnh kho (inventory_logs) cho các sản phẩm có chênh lệch
      for (let i = 0; i < validatedItems.length; i++) {
        const it = validatedItems[i];
        if (it.difference === 0) continue; // Khớp -> không cần điều chỉnh tồn kho

        const isSurplus = it.difference > 0;
        const movementType = isSurplus ? 'IMPORT' : 'EXPORT';
        const absQty = Math.abs(it.difference);
        const logId = `log_audit_${timestamp}_${i + 1}`;
        const logCode = `DC-KK-${dateCompact}-${randomSuffix}-${i + 1}`;
        const oppositeAccountCode = isSurplus ? '331' : '632';
        const diffDesc = isSurplus ? `Thừa hàng +${absQty}` : `Thiếu hàng -${absQty}`;

        // Ghi phiếu kho (inventory_logs)
        db.prepare(`
          INSERT INTO inventory_logs (
            id, code, date, type, invoice_ref, warehouse_name,
            stock_account_code, opposite_account_code, total_value,
            note, created_by, created_at
          ) VALUES (
            @id, @code, @date, @type, @invoiceRef, 'Kho Tổng Thời Trang D&D',
            '156', @oppositeAccountCode, @totalValue,
            @note, @createdBy, datetime('now')
          )
        `).run({
          id: logId,
          code: logCode,
          date: today,
          type: movementType,
          invoiceRef: auditCode,
          oppositeAccountCode,
          totalValue: it.differenceValue,
          note: `[KIỂM KHO ${auditCode}] ${diffDesc} (${trimmedReason})`,
          createdBy: auditorId
        });

        // Ghi dòng chi tiết phiếu kho -> Trigger trg_inventory_log_item_after_insert tự cập nhật current_stock!
        db.prepare(`
          INSERT INTO inventory_log_items (
            id, inventory_log_id, product_id, movement_type, item_code,
            item_name, unit, quantity, unit_price, total_amount
          ) VALUES (
            @id, @logId, @productId, @movementType, @itemCode,
            @itemName, @unit, @quantity, @unitPrice, @totalAmount
          )
        `).run({
          id: `item_log_audit_${timestamp}_${i + 1}`,
          logId,
          productId: it.product.id,
          movementType,
          itemCode: it.product.code,
          itemName: it.product.name,
          unit: it.product.unit,
          quantity: absQty,
          unitPrice: it.costPrice,
          totalAmount: it.differenceValue
        });
      }
    });

    executeAudit();

    // 5. Đọc lại tồn kho mới nhất của các sản phẩm
    const updatedProducts = validatedItems.map(it => {
      const prod = db.prepare('SELECT id, code, name, current_stock FROM products WHERE id = ?').get(it.product.id) as any;
      return {
        id: prod.id,
        code: prod.code,
        name: prod.name,
        systemStock: it.systemStock,
        actualStock: it.actualStock,
        currentStock: prod.current_stock,
        difference: it.difference,
        status: it.status
      };
    });

    res.status(201).json({
      success: true,
      message: `Đã xác nhận kiểm kho thành công cho ${validatedItems.length} sản phẩm (Khớp: ${matchedCount}, Thiếu: ${shortageCount}, Thừa: ${surplusCount}). Tồn kho đã được cân bằng chính xác.`,
      audit: {
        id: auditId,
        code: auditCode,
        date: today,
        auditorName: actualAuditorName,
        reason: trimmedReason,
        totalItems: validatedItems.length,
        totalDiff,
        matchedCount,
        shortageCount,
        surplusCount
      },
      updatedProducts
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi xác nhận phiếu kiểm kho');
  }
}

// ============================================================================
// PHÂN HỆ QUẢN LÝ HÀNG LỖI (DEFECTIVE GOODS)
// ============================================================================

/**
 * Lấy danh sách toàn bộ các sản phẩm lỗi đã ghi nhận
 * GET /api/inventory/defects
 */
export function getDefectiveGoods(req: AuthenticatedRequest, res: Response): void {
  try {
    const defects = db.prepare(`
      SELECT 
        dg.id, dg.code, dg.product_id as productId, dg.item_code as itemCode,
        dg.item_name as itemName, dg.unit, dg.quantity, dg.reason,
        dg.action_type as actionType, dg.action_title as actionTitle,
        dg.note, dg.handler_name as handlerName, dg.handler_id as handlerId,
        dg.date, dg.cost_price as costPrice, dg.total_loss as totalLoss,
        dg.status, dg.inventory_log_id as inventoryLogId, dg.created_at as createdAt,
        p.image_url as imageUrl, p.current_stock as currentStock
      FROM defective_goods dg
      LEFT JOIN products p ON p.id = dg.product_id
      ORDER BY dg.date DESC, dg.created_at DESC
    `).all() as any[];

    res.json({
      success: true,
      data: defects
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi lấy danh sách hàng lỗi');
  }
}

/**
 * Khai báo & xử lý sản phẩm lỗi / hỏng
 * POST /api/inventory/defects
 */
export function recordDefectiveGoods(req: AuthenticatedRequest, res: Response): void {
  try {
    const { productId, quantity, reason, actionType, note, date, handlerName } = req.body;

    // 1. Validate sản phẩm
    if (!productId) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng chọn sản phẩm bị lỗi/hỏng.'
      });
      return;
    }

    const product = db.prepare(`
      SELECT id, code, name, unit, cost_price, current_stock 
      FROM products 
      WHERE id = ? OR code = ?
    `).get(productId, productId) as any;

    if (!product) {
      res.status(404).json({
        success: false,
        error: `Sản phẩm '${productId}' không tồn tại trong hệ thống.`
      });
      return;
    }

    // 2. Validate số lượng hàng lỗi
    const parsedQty = Number(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0 || !Number.isInteger(parsedQty)) {
      res.status(400).json({
        success: false,
        error: 'Số lượng hàng lỗi phải là số nguyên lớn hơn 0.'
      });
      return;
    }

    // Kiểm tra không vượt quá tồn kho hiện tại
    if (parsedQty > product.current_stock) {
      res.status(400).json({
        success: false,
        error: `Không thể xử lý ${parsedQty} sản phẩm lỗi. Tồn kho hiện tại của '${product.name}' chỉ còn ${product.current_stock} ${product.unit}.`
      });
      return;
    }

    // 3. Validate lý do
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng nhập lý do sản phẩm bị lỗi/hỏng (vd: Rách vải, Lỗi đường may, Ố màu...).'
      });
      return;
    }

    // 4. Validate phân loại xử lý
    const validActions = ['REORDER', 'RETURN_SUPPLIER', 'DISPOSE'];
    if (!validActions.includes(actionType)) {
      res.status(400).json({
        success: false,
        error: 'Phân loại xử lý không hợp lệ. Vui lòng chọn: Báo nhập lại, Trả hàng nhà cung cấp, hoặc Hủy hàng lỗi.'
      });
      return;
    }

    const actionTitleMap: Record<string, string> = {
      REORDER: 'Báo nhập lại',
      RETURN_SUPPLIER: 'Trả hàng nhà cung cấp',
      DISPOSE: 'Hủy hàng lỗi'
    };
    const actionTitle = actionTitleMap[actionType] || actionType;

    const today = date || new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const dateCompact = today.replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const defectId = `defect_${timestamp}_${randomSuffix.toLowerCase()}`;
    const defectCode = `HL-${dateCompact}-${randomSuffix}`;
    const logId = `log_defect_${timestamp}_${randomSuffix.toLowerCase()}`;
    const logCode = `PXK-HL-${dateCompact}-${randomSuffix}`;

    const actualHandlerName = handlerName?.trim() || req.user?.name || 'Nhân viên quản lý kho';
    const handlerId = req.user?.id || 'usr_emp_1';

    const costPrice = Number(product.cost_price) || 0;
    const totalLoss = parsedQty * costPrice;

    // Tài khoản đối ứng kế toán khi xuất giảm hàng lỗi:
    // - Trả NCC: Giảm công nợ NCC (TK 331)
    // - Hủy hàng lỗi: Giá vốn / Hao hụt hàng hỏng (TK 632)
    // - Báo nhập lại: Tạm theo dõi hàng chờ xử lý / đặt lại (TK 156 hoặc 1388)
    const oppositeAccountCode = actionType === 'RETURN_SUPPLIER' ? '331' : (actionType === 'DISPOSE' ? '632' : '156');

    // 5. Thực thi Transaction Atomic: ghi hàng lỗi & xuất giảm tồn kho
    const executeDefect = db.transaction(() => {
      // 5.1. Tạo phiếu xuất kho (inventory_logs)
      db.prepare(`
        INSERT INTO inventory_logs (
          id, code, date, type, invoice_ref, warehouse_name,
          stock_account_code, opposite_account_code, total_value,
          note, created_by, created_at
        ) VALUES (
          @id, @code, @date, 'EXPORT', @invoiceRef, 'Kho Tổng Thời Trang D&D',
          '156', @oppositeAccountCode, @totalValue,
          @note, @createdBy, datetime('now')
        )
      `).run({
        id: logId,
        code: logCode,
        date: today,
        invoiceRef: defectCode,
        oppositeAccountCode,
        totalValue: totalLoss,
        note: `[HÀNG LỖI - ${actionTitle}] ${product.name}: ${trimmedReason}${note ? ' - ' + note : ''}`,
        createdBy: handlerId
      });

      // 5.2. Ghi dòng chi tiết phiếu kho -> Trigger trg_inventory_log_item_after_insert tự giảm current_stock!
      db.prepare(`
        INSERT INTO inventory_log_items (
          id, inventory_log_id, product_id, movement_type, item_code,
          item_name, unit, quantity, unit_price, total_amount
        ) VALUES (
          @id, @logId, @productId, 'EXPORT', @itemCode,
          @itemName, @unit, @quantity, @unitPrice, @totalAmount
        )
      `).run({
        id: `item_log_defect_${timestamp}`,
        logId,
        productId: product.id,
        itemCode: product.code,
        itemName: product.name,
        unit: product.unit,
        quantity: parsedQty,
        unitPrice: costPrice,
        totalAmount: totalLoss
      });

      // 5.3. Ghi vào bảng quản lý hàng lỗi (defective_goods)
      db.prepare(`
        INSERT INTO defective_goods (
          id, code, product_id, item_code, item_name, unit,
          quantity, reason, action_type, action_title, note,
          handler_name, handler_id, date, cost_price, total_loss,
          status, inventory_log_id, created_at
        ) VALUES (
          @id, @code, @productId, @itemCode, @itemName, @unit,
          @quantity, @reason, @actionType, @actionTitle, @note,
          @handlerName, @handlerId, @date, @costPrice, @totalLoss,
          'COMPLETED', @inventoryLogId, datetime('now')
        )
      `).run({
        id: defectId,
        code: defectCode,
        productId: product.id,
        itemCode: product.code,
        itemName: product.name,
        unit: product.unit,
        quantity: parsedQty,
        reason: trimmedReason,
        actionType,
        actionTitle,
        note: note ? String(note).trim() : null,
        handlerName: actualHandlerName,
        handlerId,
        date: today,
        costPrice,
        totalLoss,
        inventoryLogId: logId
      });
    });

    executeDefect();

    // 6. Đọc tồn kho mới nhất sau khi xuất
    const updatedProd = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(product.id) as any;

    res.status(201).json({
      success: true,
      message: `Đã ghi nhận và xử lý ${parsedQty} ${product.unit} hàng lỗi cho '${product.name}' (Phương án: ${actionTitle}). Tồn kho hiện tại còn ${updatedProd?.current_stock} ${product.unit}.`,
      defect: {
        id: defectId,
        code: defectCode,
        productName: product.name,
        productCode: product.code,
        quantity: parsedQty,
        reason: trimmedReason,
        actionType,
        actionTitle,
        date: today,
        totalLoss,
        previousStock: product.current_stock,
        newStock: updatedProd?.current_stock
      }
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi xử lý hàng lỗi');
  }
}

/**
 * Tạo mới phiếu xuất nhập kho (thủ công từ StockVoucherModal)
 * POST /api/inventory/vouchers
 */
export function createStockVoucher(req: AuthenticatedRequest, res: Response): void {
  try {
    const {
      code,
      type,
      date,
      partnerId,
      partnerName,
      delivererOrReceiver,
      warehouseName,
      stockAccountCode,
      oppositeAccountCode,
      note,
      items
    } = req.body;

    if (!type || (type !== 'IMPORT' && type !== 'EXPORT')) {
      res.status(400).json({ success: false, error: 'Loại phiếu kho không hợp lệ (phải là IMPORT hoặc EXPORT).' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Phiếu kho phải có ít nhất 1 mặt hàng.' });
      return;
    }

    const voucherId = `stock_voucher_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const voucherCode = (typeof code === 'string' && code.trim()) 
      ? code.trim() 
      : `${type === 'IMPORT' ? 'PN' : 'PX'}${Date.now().toString().slice(-6)}`;
    const voucherDate = (typeof date === 'string' && date.trim()) 
      ? date.trim() 
      : new Date().toISOString().split('T')[0];

    let totalValue = 0;

    const tx = db.transaction(() => {
      // 1. Chèn vào bảng inventory_logs
      db.prepare(`
        INSERT INTO inventory_logs (
          id, code, date, type, partner_id, partner_name, deliverer_or_receiver,
          warehouse_name, stock_account_code, opposite_account_code, total_value,
          note, created_by, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, datetime('now')
        )
      `).run(
        voucherId,
        voucherCode,
        voucherDate,
        type,
        partnerId || null,
        partnerName || null,
        delivererOrReceiver || null,
        warehouseName || 'Kho Tổng Thời Trang D&D',
        stockAccountCode || '156',
        oppositeAccountCode || (type === 'IMPORT' ? '331' : '632'),
        0,
        note || (type === 'IMPORT' ? 'Phiếu nhập kho hàng' : 'Phiếu xuất kho hàng'),
        req.user?.id || null
      );

      // 2. Chèn chi tiết mặt hàng và cập nhật tồn kho sản phẩm
      for (const it of items) {
        const itemId = `inv_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unitPrice) || 0;
        const amount = Number(it.totalAmount) || (qty * price);
        totalValue += amount;

        const prod = db.prepare('SELECT id, code, name, unit, cost_price, current_stock FROM products WHERE id = ? OR code = ?').get(it.itemId || it.productId || it.itemCode, it.itemCode || it.productId) as any;

        const resolvedProdId = prod?.id || it.itemId || it.productId;
        const resolvedCode = prod?.code || it.itemCode || 'SKU';
        const resolvedName = prod?.name || it.itemName || 'Sản phẩm';
        const resolvedUnit = prod?.unit || it.unit || 'Cái';

        db.prepare(`
          INSERT INTO inventory_log_items (
            id, inventory_log_id, product_id, movement_type,
            item_code, item_name, unit, quantity, unit_price, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          voucherId,
          resolvedProdId,
          type,
          resolvedCode,
          resolvedName,
          resolvedUnit,
          qty,
          price,
          amount
        );

        if (prod) {
          if (type === 'IMPORT') {
            db.prepare(`
              UPDATE products 
              SET current_stock = current_stock + ?,
                  opening_value = (current_stock + ?) * cost_price,
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(qty, qty, prod.id);
          } else {
            db.prepare(`
              UPDATE products 
              SET current_stock = MAX(0, current_stock - ?),
                  opening_value = MAX(0, (current_stock - ?) * cost_price),
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(qty, qty, prod.id);
          }
        }
      }

      db.prepare('UPDATE inventory_logs SET total_value = ? WHERE id = ?').run(totalValue, voucherId);
    });

    tx();

    const createdVoucher = db.prepare('SELECT * FROM inventory_logs WHERE id = ?').get(voucherId) as any;
    const createdItems = db.prepare('SELECT * FROM inventory_log_items WHERE inventory_log_id = ?').all(voucherId);

    res.status(201).json({
      success: true,
      message: `Tạo ${type === 'IMPORT' ? 'phiếu nhập kho' : 'phiếu xuất kho'} ${voucherCode} thành công.`,
      voucher: { ...createdVoucher, items: createdItems }
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi tạo phiếu xuất nhập kho');
  }
}

/**
 * Xóa phiếu xuất nhập kho và hoàn lại tồn kho
 * DELETE /api/inventory/vouchers/:id
 */
export function deleteStockVoucher(req: AuthenticatedRequest, res: Response): void {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Thiếu ID phiếu kho cần xóa.' });
      return;
    }

    const voucher = db.prepare('SELECT * FROM inventory_logs WHERE id = ?').get(id) as any;
    if (!voucher) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu kho.' });
      return;
    }

    const items = db.prepare('SELECT * FROM inventory_log_items WHERE inventory_log_id = ?').all(id) as any[];

    const tx = db.transaction(() => {
      // 1. Hoàn lại số lượng tồn kho sản phẩm
      for (const it of items) {
        if (it.product_id) {
          if (voucher.type === 'IMPORT') {
            db.prepare(`
              UPDATE products 
              SET current_stock = MAX(0, current_stock - ?),
                  opening_value = MAX(0, (current_stock - ?) * cost_price),
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(it.quantity, it.quantity, it.product_id);
          } else {
            db.prepare(`
              UPDATE products 
              SET current_stock = current_stock + ?,
                  opening_value = (current_stock + ?) * cost_price,
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(it.quantity, it.quantity, it.product_id);
          }
        }
      }

      // 2. Xóa chi tiết và phiếu kho
      db.prepare('DELETE FROM inventory_log_items WHERE inventory_log_id = ?').run(id);
      db.prepare('DELETE FROM inventory_logs WHERE id = ?').run(id);
    });

    tx();

    res.json({
      success: true,
      message: `Đã xóa phiếu kho ${voucher.code} và cân bằng lại tồn kho thành công.`
    });
  } catch (error: any) {
    handleDbError(res, error, 'Lỗi khi xóa phiếu kho');
  }
}



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

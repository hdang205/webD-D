import db from '../../db/database.js';
import { generateInitialStock } from '../utils/initialStockGenerator.js';

export interface InitStockResult {
  success: boolean;
  message: string;
  totalUpdated: number;
  totalStockQuantity: number;
  totalInventoryValue: number;
  inventoryLogCode?: string;
  items: Array<{
    code: string;
    name: string;
    category: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    totalValue: number;
  }>;
}

/**
 * Thực hiện khởi tạo tồn kho ban đầu cho các sản phẩm đang có tồn kho bằng 0
 * Tuân thủ quy chuẩn kế toán và trigger tồn kho SQLite:
 * - KHÔNG sửa trực tiếp current_stock
 * - Ghi nhận vào inventory_logs (loại IMPORT, tham chiếu INITIAL_STOCK, TK đối ứng 411)
 * - Chèn chi tiết vào inventory_log_items để kích hoạt trigger trg_inventory_log_item_after_insert
 */
export function applyInitialStock(userId?: string): InitStockResult {
  // 1. Lấy danh sách sản phẩm đang có tồn kho bằng 0
  const zeroStockProducts = db.prepare(`
    SELECT 
      p.id,
      p.code,
      p.name,
      p.unit,
      p.cost_price as costPrice,
      p.selling_price as sellingPrice,
      p.current_stock as currentStock,
      c.name as categoryName
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.current_stock = 0
    ORDER BY p.code ASC
  `).all() as any[];

  if (zeroStockProducts.length === 0) {
    // Đã có tồn kho đầy đủ
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalProducts,
        SUM(current_stock) as totalStock,
        SUM(current_stock * cost_price) as totalValue
      FROM products
    `).get() as any;

    return {
      success: true,
      message: 'Tất cả sản phẩm đã có tồn kho ban đầu hợp lệ.',
      totalUpdated: 0,
      totalStockQuantity: stats.totalStock || 0,
      totalInventoryValue: stats.totalValue || 0,
      items: []
    };
  }

  const inventoryLogId = `log_init_${Date.now()}`;
  const inventoryLogCode = `PNK-DK${Date.now().toString().slice(-4)}`;
  const date = '2026-08-01'; // Đầu kỳ hạch toán tháng 8/2026

  let calculatedTotalValue = 0;
  let calculatedTotalQty = 0;

  const itemsToInsert = zeroStockProducts.map(p => {
    const qty = generateInitialStock(p.categoryName, p.code);
    const costPrice = Number(p.costPrice || 0);
    const totalAmount = qty * costPrice;

    calculatedTotalQty += qty;
    calculatedTotalValue += totalAmount;

    return {
      productId: p.id,
      code: p.code,
      name: p.name,
      unit: p.unit || 'Cái',
      category: p.categoryName || 'Thời Trang',
      quantity: qty,
      costPrice,
      sellingPrice: Number(p.sellingPrice || 0),
      totalAmount
    };
  });

  // Thực thi nguyên tử qua Transaction
  const runTransaction = db.transaction(() => {
    // 1. Tạo phiếu nhập kho ban đầu
    db.prepare(`
      INSERT INTO inventory_logs (
        id, code, date, type, invoice_ref, invoice_id, partner_id,
        partner_name, warehouse_name, stock_account_code, opposite_account_code,
        total_value, note, created_by, created_at
      ) VALUES (
        @id, @code, @date, 'IMPORT', 'INITIAL_STOCK', NULL, NULL,
        'Số Dư Đầu Kỳ', 'Kho Tổng Thời Trang D&D', '156', '411',
        @totalValue, 'Nhập tồn kho ban đầu (INITIAL_STOCK)', @createdBy, datetime('now')
      )
    `).run({
      id: inventoryLogId,
      code: inventoryLogCode,
      date,
      totalValue: calculatedTotalValue,
      createdBy: userId || 'usr_emp_1'
    });

    // 2. Chèn từng dòng chi tiết phiếu nhập kho
    // Trigger trg_inventory_log_item_after_insert sẽ TỰ ĐỘNG tăng products.current_stock
    const insertItemStmt = db.prepare(`
      INSERT INTO inventory_log_items (
        id, inventory_log_id, product_id, movement_type, item_code,
        item_name, unit, quantity, unit_price, total_amount
      ) VALUES (
        @id, @logId, @productId, 'IMPORT', @itemCode,
        @itemName, @unit, @quantity, @unitPrice, @totalAmount
      )
    `);

    // Đồng bộ opening_quantity và opening_value cho trùng khớp với tồn ban đầu
    const updateOpeningStmt = db.prepare(`
      UPDATE products 
      SET opening_quantity = current_stock,
          opening_value = current_stock * cost_price,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    for (let i = 0; i < itemsToInsert.length; i++) {
      const it = itemsToInsert[i];
      insertItemStmt.run({
        id: `item_${inventoryLogId}_${i + 1}`,
        logId: inventoryLogId,
        productId: it.productId,
        itemCode: it.code,
        itemName: it.name,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.costPrice,
        totalAmount: it.totalAmount
      });

      // Cập nhật opening_quantity sau khi trigger đã tăng current_stock
      updateOpeningStmt.run(it.productId);
    }
  });

  runTransaction();

  // Lấy tổng thống kê toàn kho sau khi cập nhật
  const overallStats = db.prepare(`
    SELECT 
      SUM(current_stock) as totalStock,
      SUM(current_stock * cost_price) as totalValue
    FROM products
  `).get() as any;

  return {
    success: true,
    message: `Đã khởi tạo tồn kho ban đầu cho ${itemsToInsert.length} sản phẩm thông qua phiếu nhập kho ${inventoryLogCode}.`,
    totalUpdated: itemsToInsert.length,
    totalStockQuantity: overallStats.totalStock || calculatedTotalQty,
    totalInventoryValue: overallStats.totalValue || calculatedTotalValue,
    inventoryLogCode,
    items: itemsToInsert.map(it => ({
      code: it.code,
      name: it.name,
      category: it.category,
      quantity: it.quantity,
      costPrice: it.costPrice,
      sellingPrice: it.sellingPrice,
      totalValue: it.totalAmount
    }))
  };
}

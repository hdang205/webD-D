import { Response } from 'express';
import db from '../../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbErrors.js';

/**
 * Lấy danh sách sản phẩm với bộ lọc & tìm kiếm
 * GET /api/products?search=...&category_id=...&stock_status=...
 */
export function getProducts(req: AuthenticatedRequest, res: Response): void {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const categoryId = typeof req.query.category_id === 'string' ? req.query.category_id.trim() : '';
    const stockStatus = typeof req.query.stock_status === 'string' ? req.query.stock_status.trim() : '';

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
        p.current_stock as openingQuantity,
        (p.current_stock * p.cost_price) as openingValue,
        p.current_stock as currentStock,
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
      sql += ` AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ? OR p.color LIKE ? OR c.name LIKE ?) `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    if (categoryId && categoryId !== 'ALL') {
      sql += ` AND p.category_id = ? `;
      params.push(categoryId);
    }

    if (stockStatus === 'LOW') {
      sql += ` AND p.current_stock <= p.min_stock_level AND p.current_stock > 0 `;
    } else if (stockStatus === 'OUT') {
      sql += ` AND p.current_stock <= 0 `;
    } else if (stockStatus === 'IN_STOCK') {
      sql += ` AND p.current_stock > p.min_stock_level `;
    }

    sql += ` ORDER BY p.created_at DESC `;

    const rows = db.prepare(sql).all(...params) as any[];

    // Bảo mật: Ẩn giá vốn đối với nhân viên bán hàng / thu ngân
    const userRole = req.user?.role;
    const canViewCost = userRole === 'DIRECTOR' || userRole === 'CHIEF_ACCOUNTANT' || userRole === 'WAREHOUSE_MANAGER';
    if (!canViewCost) {
      rows.forEach(item => {
        delete item.costPrice;
        delete item.openingValue;
      });
    }

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tải danh sách sản phẩm');
  }
}

/**
 * Lấy chi tiết sản phẩm theo ID hoặc Code
 * GET /api/products/:id
 */
export function getProductById(req: AuthenticatedRequest, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
      return;
    }

    const row = db.prepare(`
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
        p.current_stock as openingQuantity,
        (p.current_stock * p.cost_price) as openingValue,
        p.current_stock as currentStock,
        p.min_stock_level as minStockLevel,
        p.description,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ? OR p.code = ?
    `).get(id, id) as any;

    if (!row) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }

    const userRole = req.user?.role;
    const canViewCost = userRole === 'DIRECTOR' || userRole === 'CHIEF_ACCOUNTANT' || userRole === 'WAREHOUSE_MANAGER';
    if (!canViewCost) {
      delete row.costPrice;
      delete row.openingValue;
    }

    res.status(200).json({
      success: true,
      data: row
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi lấy thông tin sản phẩm');
  }
}

/**
 * Thêm mới một sản phẩm
 * POST /api/products
 */
export function createProduct(req: AuthenticatedRequest, res: Response): void {
  try {
    const {
      code,
      name,
      unit,
      categoryId,
      category,
      size,
      color,
      barcode,
      imageUrl,
      costPrice,
      sellingPrice,
      openingQuantity,
      minStockLevel,
      description
    } = req.body || {};

    const errors: Record<string, string> = {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Tên sản phẩm là bắt buộc và không được để trống';
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      errors.code = 'Mã sản phẩm (SKU) là bắt buộc';
    }

    // Xác định category_id
    let resolvedCategoryId = typeof categoryId === 'string' ? categoryId.trim() : '';
    if (!resolvedCategoryId && typeof category === 'string' && category.trim()) {
      const matchedCat = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(category.trim()) as any;
      if (matchedCat) {
        resolvedCategoryId = matchedCat.id;
      }
    }

    if (!resolvedCategoryId) {
      errors.categoryId = 'Danh mục sản phẩm là bắt buộc và phải tồn tại';
    } else {
      const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(resolvedCategoryId);
      if (!catExists) {
        errors.categoryId = 'Danh mục được chọn không tồn tại trong hệ thống';
      }
    }

    const numCostPrice = Number(costPrice ?? 0);
    const numSellingPrice = Number(sellingPrice ?? 0);
    const numOpeningQuantity = Number(openingQuantity ?? 0);
    const numMinStock = Number(minStockLevel ?? 0);

    if (isNaN(numCostPrice) || numCostPrice < 0) {
      errors.costPrice = 'Giá vốn phải là số lớn hơn hoặc bằng 0';
    }
    if (isNaN(numSellingPrice) || numSellingPrice < 0) {
      errors.sellingPrice = 'Giá bán phải là số lớn hơn hoặc bằng 0';
    }
    if (isNaN(numOpeningQuantity) || numOpeningQuantity < 0) {
      errors.openingQuantity = 'Số lượng tồn kho ban đầu phải là số nguyên không âm';
    }
    if (isNaN(numMinStock) || numMinStock < 0) {
      errors.minStockLevel = 'Định mức tồn tối thiểu phải là số không âm';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu sản phẩm không hợp lệ',
        errors
      });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanUnit = (typeof unit === 'string' && unit.trim()) ? unit.trim() : 'Cái';
    const cleanSize = typeof size === 'string' ? size.trim() : null;
    const cleanColor = typeof color === 'string' ? color.trim() : null;
    const cleanBarcode = (typeof barcode === 'string' && barcode.trim()) ? barcode.trim() : null;
    const cleanImage = typeof imageUrl === 'string' ? imageUrl.trim() : null;
    const cleanDesc = typeof description === 'string' ? description.trim() : null;
    const newId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const openingValue = numOpeningQuantity * numCostPrice;

    const insertStmt = db.prepare(`
      INSERT INTO products (
        id, code, name, unit, category_id, size, color, barcode, image_url,
        cost_price, selling_price, opening_quantity, opening_value, current_stock, min_stock_level, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      newId,
      cleanCode,
      cleanName,
      cleanUnit,
      resolvedCategoryId,
      cleanSize,
      cleanColor,
      cleanBarcode,
      cleanImage,
      numCostPrice,
      numSellingPrice,
      numOpeningQuantity,
      openingValue,
      numOpeningQuantity,
      numMinStock,
      cleanDesc
    );

    const created = db.prepare(`
      SELECT 
        p.id, p.code, p.name, p.unit, p.category_id as categoryId, c.name as category,
        p.size, p.color, p.barcode, p.image_url as imageUrl,
        p.cost_price as costPrice, p.selling_price as sellingPrice,
        p.current_stock as openingQuantity, (p.current_stock * p.cost_price) as openingValue,
        p.current_stock as currentStock, p.min_stock_level as minStockLevel,
        p.description, p.created_at as createdAt, p.updated_at as updatedAt
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(newId);

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      data: created
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tạo mới sản phẩm');
  }
}

/**
 * Cập nhật thông tin sản phẩm
 * PUT /api/products/:id
 */
export function updateProduct(req: AuthenticatedRequest, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
      return;
    }

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }

    const {
      code,
      name,
      unit,
      categoryId,
      category,
      size,
      color,
      barcode,
      imageUrl,
      costPrice,
      sellingPrice,
      minStockLevel,
      description
    } = req.body || {};

    const errors: Record<string, string> = {};

    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      errors.name = 'Tên sản phẩm không được để trống';
    }

    if (code !== undefined && (!code || typeof code !== 'string' || !code.trim())) {
      errors.code = 'Mã sản phẩm không được để trống';
    }

    let resolvedCategoryId = existing.category_id;
    if (categoryId !== undefined && categoryId) {
      const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
      if (!catExists) {
        errors.categoryId = 'Danh mục được chọn không tồn tại';
      } else {
        resolvedCategoryId = categoryId;
      }
    } else if (category !== undefined && category) {
      const matchedCat = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(String(category).trim()) as any;
      if (matchedCat) {
        resolvedCategoryId = matchedCat.id;
      }
    }

    const numCostPrice = costPrice !== undefined ? Number(costPrice) : existing.cost_price;
    const numSellingPrice = sellingPrice !== undefined ? Number(sellingPrice) : existing.selling_price;
    const numMinStock = minStockLevel !== undefined ? Number(minStockLevel) : existing.min_stock_level;

    if (isNaN(numCostPrice) || numCostPrice < 0) {
      errors.costPrice = 'Giá vốn phải là số không âm';
    }
    if (isNaN(numSellingPrice) || numSellingPrice < 0) {
      errors.sellingPrice = 'Giá bán phải là số không âm';
    }
    if (isNaN(numMinStock) || numMinStock < 0) {
      errors.minStockLevel = 'Định mức tồn tối thiểu phải là số không âm';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu cập nhật sản phẩm không hợp lệ',
        errors
      });
      return;
    }

    const cleanCode = code !== undefined ? code.trim().toUpperCase() : existing.code;
    const cleanName = name !== undefined ? name.trim() : existing.name;
    const cleanUnit = unit !== undefined ? unit.trim() : existing.unit;
    const cleanSize = size !== undefined ? (size ? size.trim() : null) : existing.size;
    const cleanColor = color !== undefined ? (color ? color.trim() : null) : existing.color;
    const cleanBarcode = barcode !== undefined ? (barcode ? barcode.trim() : null) : existing.barcode;
    const cleanImage = imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : existing.image_url;
    const cleanDesc = description !== undefined ? (description ? description.trim() : null) : existing.description;

    db.prepare(`
      UPDATE products
      SET code = ?, name = ?, unit = ?, category_id = ?, size = ?, color = ?,
          barcode = ?, image_url = ?, cost_price = ?, selling_price = ?,
          min_stock_level = ?, description = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      cleanCode,
      cleanName,
      cleanUnit,
      resolvedCategoryId,
      cleanSize,
      cleanColor,
      cleanBarcode,
      cleanImage,
      numCostPrice,
      numSellingPrice,
      numMinStock,
      cleanDesc,
      id
    );

    const updated = db.prepare(`
      SELECT 
        p.id, p.code, p.name, p.unit, p.category_id as categoryId, c.name as category,
        p.size, p.color, p.barcode, p.image_url as imageUrl,
        p.cost_price as costPrice, p.selling_price as sellingPrice,
        p.current_stock as openingQuantity, (p.current_stock * p.cost_price) as openingValue,
        p.current_stock as currentStock, p.min_stock_level as minStockLevel,
        p.description, p.created_at as createdAt, p.updated_at as updatedAt
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(id);

    res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: updated
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi cập nhật sản phẩm');
  }
}

/**
 * Xóa sản phẩm
 * DELETE /api/products/:id
 */
export function deleteProduct(req: AuthenticatedRequest, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
      return;
    }

    const existing = db.prepare('SELECT id, name, code FROM products WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
      return;
    }

    // Kiểm tra ràng buộc hóa đơn & phiếu kho
    const invoiceCount = (db.prepare('SELECT COUNT(*) as count FROM invoice_items WHERE product_id = ?').get(id) as any)?.count || 0;
    const inventoryCount = (db.prepare('SELECT COUNT(*) as count FROM inventory_log_items WHERE product_id = ?').get(id) as any)?.count || 0;

    if (invoiceCount > 0 || inventoryCount > 0) {
      res.status(409).json({
        success: false,
        message: `Không thể xóa sản phẩm "${existing.name}" (${existing.code}) do đã có phát sinh giao dịch hóa đơn (${invoiceCount}) hoặc chứng từ kho (${inventoryCount}).`
      });
      return;
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    res.status(200).json({
      success: true,
      message: `Đã xóa sản phẩm "${existing.name}" thành công`
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi xóa sản phẩm');
  }
}

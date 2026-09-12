import { Request, Response } from 'express';
import db from '../../db/database.js';
import { handleDbError } from '../utils/dbErrors.js';

/**
 * Lấy danh sách danh mục thời trang (hỗ trợ tìm kiếm theo tên hoặc mã)
 * GET /api/categories?search=...
 */
export function getCategories(req: Request, res: Response): void {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let sql = `
      SELECT 
        c.id, 
        c.code, 
        c.name, 
        c.description, 
        c.created_at as createdAt,
        COUNT(p.id) as productCount
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
    `;
    const params: any[] = [];

    if (search) {
      sql += ` WHERE c.name LIKE ? OR c.code LIKE ? `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    sql += ` GROUP BY c.id ORDER BY c.name ASC `;

    const rows = db.prepare(sql).all(...params);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tải danh sách danh mục');
  }
}

/**
 * Lấy chi tiết một danh mục theo ID hoặc mã code
 * GET /api/categories/:id
 */
export function getCategoryById(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID danh mục không hợp lệ' });
      return;
    }

    const row = db.prepare(`
      SELECT 
        c.id, 
        c.code, 
        c.name, 
        c.description, 
        c.created_at as createdAt,
        COUNT(p.id) as productCount
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      WHERE c.id = ? OR c.code = ?
      GROUP BY c.id
    `).get(id, id);

    if (!row) {
      res.status(404).json({ success: false, message: 'Không tìm thấy danh mục yêu cầu' });
      return;
    }

    res.status(200).json({
      success: true,
      data: row
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi lấy thông tin danh mục');
  }
}

/**
 * Thêm mới một danh mục
 * POST /api/categories
 */
export function createCategory(req: Request, res: Response): void {
  try {
    const { name, code, description } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Tên danh mục không được để trống',
        errors: { name: 'Tên danh mục là bắt buộc' }
      });
      return;
    }

    const cleanName = name.trim();
    const cleanCode = (typeof code === 'string' && code.trim())
      ? code.trim().toUpperCase()
      : `CAT_${Date.now().toString().slice(-6)}`;
    const cleanDesc = typeof description === 'string' ? description.trim() : null;
    const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const insertStmt = db.prepare(`
      INSERT INTO categories (id, code, name, description)
      VALUES (?, ?, ?, ?)
    `);

    insertStmt.run(newId, cleanCode, cleanName, cleanDesc);

    const created = db.prepare(`
      SELECT id, code, name, description, created_at as createdAt, 0 as productCount
      FROM categories WHERE id = ?
    `).get(newId);

    res.status(201).json({
      success: true,
      message: 'Thêm danh mục thành công',
      data: created
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tạo mới danh mục');
  }
}

/**
 * Cập nhật thông tin danh mục
 * PUT /api/categories/:id
 */
export function updateCategory(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    const { name, code, description } = req.body || {};

    if (!id) {
      res.status(400).json({ success: false, message: 'ID danh mục không hợp lệ' });
      return;
    }

    // Kiểm tra danh mục có tồn tại không
    const existing = db.prepare('SELECT id, code, name FROM categories WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
      return;
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Tên danh mục không được để trống',
        errors: { name: 'Tên danh mục là bắt buộc' }
      });
      return;
    }

    const cleanName = name.trim();
    const cleanCode = (typeof code === 'string' && code.trim()) ? code.trim().toUpperCase() : existing.code;
    const cleanDesc = typeof description === 'string' ? description.trim() : null;

    db.prepare(`
      UPDATE categories
      SET name = ?, code = ?, description = ?
      WHERE id = ?
    `).run(cleanName, cleanCode, cleanDesc, id);

    const updated = db.prepare(`
      SELECT 
        c.id, 
        c.code, 
        c.name, 
        c.description, 
        c.created_at as createdAt,
        COUNT(p.id) as productCount
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id);

    res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      data: updated
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi cập nhật danh mục');
  }
}

/**
 * Xóa danh mục
 * DELETE /api/categories/:id
 */
export function deleteCategory(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID danh mục không hợp lệ' });
      return;
    }

    const existing = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
      return;
    }

    // Kiểm tra ràng buộc sản phẩm
    const productCheck = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id) as any;
    if (productCheck && productCheck.count > 0) {
      res.status(409).json({
        success: false,
        message: `Không thể xóa danh mục "${existing.name}" vì hiện đang có ${productCheck.count} sản phẩm trực thuộc.`
      });
      return;
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    res.status(200).json({
      success: true,
      message: `Đã xóa danh mục "${existing.name}" thành công`
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi xóa danh mục');
  }
}

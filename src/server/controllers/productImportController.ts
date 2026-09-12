import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import * as XLSXModule from 'xlsx';
const XLSX: any = (XLSXModule as any).default || XLSXModule;
import db from '../../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { generateFashionPrice } from '../utils/priceGenerator.js';

interface ExcelProductRow {
  product_code?: string;
  product_name?: string;
  category_name?: string;
  sale_price?: number | string;
  purchase_price?: number | string;
  image?: string;
  initial_stock?: number | string;
}

/**
 * Tạo mã slug an toàn từ tên tiếng Việt
 */
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

/**
 * Controller xử lý Import 140 sản phẩm từ file Excel DD_products_import.xlsx
 * POST /api/products/import
 */
export function importProductsFromExcel(req: AuthenticatedRequest, res: Response): void {
  try {
    let workbook: any;

    // Trường hợp 1: Nhận file base64 từ client upload
    if (req.body && req.body.fileBase64) {
      const buffer = Buffer.from(req.body.fileBase64, 'base64');
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } else {
      // Trường hợp 2: Đọc file mặc định tại data/import/DD_products_import.xlsx
      const defaultPath = path.resolve(process.cwd(), 'data', 'import', 'DD_products_import.xlsx');
      if (!fs.existsSync(defaultPath)) {
        res.status(404).json({
          success: false,
          error: `Không tìm thấy file Excel tại đường dẫn: ${defaultPath}`
        });
        return;
      }
      workbook = XLSX.readFile(defaultPath);
    }

    // Chọn sheet 'Products' hoặc sheet đầu tiên
    const sheetName = workbook.SheetNames.includes('Products') ? 'Products' : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      res.status(400).json({
        success: false,
        error: 'File Excel không có trang tính dữ liệu hợp lệ.'
      });
      return;
    }

    const rawRows = XLSX.utils.sheet_to_json(sheet) as ExcelProductRow[];
    if (!rawRows || rawRows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'File Excel rỗng, không có dữ liệu sản phẩm để import.'
      });
      return;
    }

    // Lấy danh sách sản phẩm hiện có trong SQLite để kiểm tra trùng lặp
    const existingProductRows = db.prepare('SELECT code FROM products').all() as { code: string }[];
    const existingDbCodes = new Set(existingProductRows.map(p => p.code.trim().toUpperCase()));

    // Lấy danh sách categories hiện có
    const existingCategoryRows = db.prepare('SELECT id, code, name FROM categories').all() as { id: string; code: string; name: string }[];
    const categoryMap = new Map<string, { id: string; code: string; name: string }>();
    existingCategoryRows.forEach(c => {
      categoryMap.set(c.name.trim().toLowerCase(), c);
    });

    const validatedProducts: any[] = [];
    const seenCodesInFile = new Set<string>();
    const newCategoriesToCreate = new Map<string, { id: string; code: string; name: string }>();

    // Vòng lặp kiểm tra & validate toàn bộ dữ liệu trước khi nạp
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // Hàng thực tế trên file Excel (sau header)

      const code = (row.product_code || '').toString().trim();
      const name = (row.product_name || '').toString().trim();
      const catName = (row.category_name || '').toString().trim();

      // 1. Validate mã sản phẩm
      if (!code) {
        res.status(400).json({
          success: false,
          error: `Dòng ${rowNum}: Mã sản phẩm (product_code) không được để trống.`
        });
        return;
      }

      const upperCode = code.toUpperCase();
      if (seenCodesInFile.has(upperCode)) {
        res.status(409).json({
          success: false,
          error: `Dòng ${rowNum}: Mã sản phẩm '${code}' bị trùng lặp ngay trong file Excel.`
        });
        return;
      }
      seenCodesInFile.add(upperCode);

      const { failOnDuplicate = false } = req.body || {};
      if (failOnDuplicate && existingDbCodes.has(upperCode)) {
        res.status(409).json({
          success: false,
          error: `Dòng ${rowNum}: Mã sản phẩm '${code}' đã tồn tại trong database.`
        });
        return;
      }

      // 2. Validate tên sản phẩm
      if (!name) {
        res.status(400).json({
          success: false,
          error: `Dòng ${rowNum}: Tên sản phẩm (product_name) không được để trống.`
        });
        return;
      }

      // 3. Validate danh mục
      if (!catName) {
        res.status(400).json({
          success: false,
          error: `Dòng ${rowNum}: Danh mục sản phẩm (category_name) không được để trống.`
        });
        return;
      }

      // Xác định Category ID (nếu chưa có thì lên danh sách tạo mới, không tạo trùng)
      const catKey = catName.toLowerCase();
      let targetCategory = categoryMap.get(catKey) || newCategoriesToCreate.get(catKey);
      if (!targetCategory) {
        const catSlug = slugify(catName);
        targetCategory = {
          id: `cat_${catSlug.toLowerCase()}`,
          code: `CAT_${catSlug}`,
          name: catName
        };
        newCategoriesToCreate.set(catKey, targetCategory);
      }

      // 4. Giá bán và giá nhập (Nếu để trống thì tự động sinh giá thời trang hợp lý)
      let salePrice: number;
      let purchasePrice: number;

      const rawSale = row.sale_price !== '' && row.sale_price !== undefined ? Number(row.sale_price) : NaN;
      const rawCost = row.purchase_price !== '' && row.purchase_price !== undefined ? Number(row.purchase_price) : NaN;

      if (!isNaN(rawSale) && rawSale >= 0 && !isNaN(rawCost) && rawCost >= 0) {
        salePrice = rawSale;
        purchasePrice = rawCost;
      } else {
        const generated = generateFashionPrice(code, catName);
        salePrice = !isNaN(rawSale) && rawSale >= 0 ? rawSale : generated.salePrice;
        purchasePrice = !isNaN(rawCost) && rawCost >= 0 ? rawCost : generated.purchasePrice;
      }

      if (salePrice < 0) {
        res.status(400).json({
          success: false,
          error: `Dòng ${rowNum}: Giá bán không được là số âm (giá trị: ${salePrice}).`
        });
        return;
      }

      if (purchasePrice < 0) {
        res.status(400).json({
          success: false,
          error: `Dòng ${rowNum}: Giá nhập không được là số âm (giá trị: ${purchasePrice}).`
        });
        return;
      }

      // 5. Tồn kho đầu kỳ
      const initialStock = row.initial_stock !== '' && row.initial_stock !== undefined ? Number(row.initial_stock) : 0;
      if (isNaN(initialStock) || initialStock < 0) {
        res.status(400).json({
          success: false,
          error: `Dòng ${rowNum}: Tồn kho ban đầu không hợp lệ (giá trị: ${row.initial_stock}).`
        });
        return;
      }

      // 6. Đường dẫn ảnh
      const imageFileName = (row.image || `${code}.png`).toString().trim();
      const imageUrl = `/images/products/${imageFileName}`;

      // Đơn vị tính tự động theo nhóm
      let unit = 'Cái';
      if (catName.includes('Giày') || catName.includes('Dép')) unit = 'Đôi';
      else if (catName.includes('Bộ')) unit = 'Bộ';

      validatedProducts.push({
        id: `prod_${code.toLowerCase()}_${Date.now()}`,
        code,
        name,
        unit,
        categoryId: targetCategory.id,
        categoryName: targetCategory.name,
        imageUrl,
        costPrice: purchasePrice,
        sellingPrice: salePrice,
        initialStock,
        description: `Mẫu thời trang ${name} thuộc bộ sưu tập ${catName}.`
      });
    }

    // ========================================================================
    // THỰC THI TRANSACTION ATOMIC: INSERT TẤT CẢ VÀO DATABASE SQLITE
    // ========================================================================
    let minSale = Infinity, maxSale = 0, sumSale = 0;
    let minCost = Infinity, maxCost = 0, sumCost = 0;

    const importTransaction = db.transaction(() => {
      // 1. Tạo các danh mục mới nếu chưa tồn tại
      const insertCatStmt = db.prepare(`
        INSERT INTO categories (id, code, name, description, created_at)
        VALUES (@id, @code, @name, @description, datetime('now'))
      `);

      newCategoriesToCreate.forEach(cat => {
        // Kiểm tra lại lần nữa trong DB để tránh conflict
        const check = db.prepare('SELECT id FROM categories WHERE id = ? OR code = ? OR LOWER(name) = LOWER(?)').get(cat.id, cat.code, cat.name);
        if (!check) {
          insertCatStmt.run({
            id: cat.id,
            code: cat.code,
            name: cat.name,
            description: `Nhóm sản phẩm ${cat.name}`
          });
        }
      });

      // 2. Chèn 140 sản phẩm vào bảng products
      const insertProdStmt = db.prepare(`
        INSERT INTO products (
          id, code, name, unit, category_id, size, color, barcode, 
          image_url, cost_price, selling_price, opening_quantity, 
          opening_value, current_stock, min_stock_level, description, 
          created_at, updated_at
        ) VALUES (
          @id, @code, @name, @unit, @categoryId, 'M', 'Tiêu chuẩn', @code,
          @imageUrl, @costPrice, @sellingPrice, @initialStock,
          @openingValue, @initialStock, 5, @description,
          datetime('now'), datetime('now')
        )
        ON CONFLICT(code) DO UPDATE SET
          name = excluded.name,
          category_id = excluded.category_id,
          image_url = excluded.image_url,
          cost_price = excluded.cost_price,
          selling_price = excluded.selling_price,
          description = excluded.description,
          updated_at = datetime('now')
      `);

      for (const prod of validatedProducts) {
        insertProdStmt.run({
          id: prod.id,
          code: prod.code,
          name: prod.name,
          unit: prod.unit,
          categoryId: prod.categoryId,
          imageUrl: prod.imageUrl,
          costPrice: prod.costPrice,
          sellingPrice: prod.sellingPrice,
          initialStock: prod.initialStock,
          openingValue: prod.initialStock * prod.costPrice,
          description: prod.description
        });

        // Tính toán thống kê giá
        if (prod.sellingPrice < minSale) minSale = prod.sellingPrice;
        if (prod.sellingPrice > maxSale) maxSale = prod.sellingPrice;
        sumSale += prod.sellingPrice;

        if (prod.costPrice < minCost) minCost = prod.costPrice;
        if (prod.costPrice > maxCost) maxCost = prod.costPrice;
        sumCost += prod.costPrice;
      }
    });

    // Thực thi transaction
    importTransaction();

    const totalCategoriesInDb = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count;
    const totalProductsInDb = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;

    const count = validatedProducts.length;
    res.status(201).json({
      success: true,
      message: `Đã import thành công ${count} sản phẩm vào cơ sở dữ liệu SQLite.`,
      stats: {
        total: rawRows.length,
        success: count,
        failed: 0,
        errors: [],
        pricing: {
          minSalePrice: minSale === Infinity ? 0 : minSale,
          maxSalePrice: maxSale,
          avgSalePrice: count > 0 ? Math.round(sumSale / count) : 0,
          minPurchasePrice: minCost === Infinity ? 0 : minCost,
          maxPurchasePrice: maxCost,
          avgPurchasePrice: count > 0 ? Math.round(sumCost / count) : 0
        },
        newCategoriesCreated: newCategoriesToCreate.size,
        totalCategoriesInDb,
        totalProductsInDb
      }
    });
  } catch (error: any) {
    console.error('Lỗi khi import sản phẩm từ Excel:', error);
    res.status(500).json({
      success: false,
      error: `Có lỗi xảy ra khi xử lý file Excel: ${error.message || 'Lỗi hệ thống'}`
    });
  }
}

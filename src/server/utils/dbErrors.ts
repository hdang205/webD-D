import { Response } from 'express';

/**
 * Xử lý và chuyển đổi ngoại lệ SQLite sang phản hồi JSON thân thiện với người dùng
 */
export function handleDbError(res: Response, error: any, defaultMessage: string = 'Đã xảy ra lỗi cơ sở dữ liệu'): void {
  const errMsg = String(error?.message || '');
  console.error('Database Operation Error:', errMsg);

  // 1. UNIQUE constraint
  if (errMsg.includes('UNIQUE constraint failed')) {
    if (errMsg.includes('categories.name')) {
      res.status(409).json({ success: false, message: 'Tên danh mục đã tồn tại trong hệ thống.' });
      return;
    }
    if (errMsg.includes('categories.code')) {
      res.status(409).json({ success: false, message: 'Mã danh mục đã tồn tại trong hệ thống.' });
      return;
    }
    if (errMsg.includes('products.code')) {
      res.status(409).json({ success: false, message: 'Mã sản phẩm (SKU) đã tồn tại.' });
      return;
    }
    if (errMsg.includes('products.barcode')) {
      res.status(409).json({ success: false, message: 'Mã vạch (Barcode) sản phẩm đã tồn tại.' });
      return;
    }
    if (errMsg.includes('partners.code')) {
      res.status(409).json({ success: false, message: 'Mã đối tác (khách hàng/nhà cung cấp) đã tồn tại.' });
      return;
    }
    if (errMsg.includes('employees.code')) {
      res.status(409).json({ success: false, message: 'Mã nhân viên đã tồn tại.' });
      return;
    }
    if (errMsg.includes('users.username')) {
      res.status(409).json({ success: false, message: 'Tên đăng nhập tài khoản đã được sử dụng.' });
      return;
    }
    res.status(409).json({ success: false, message: 'Dữ liệu đã tồn tại trong hệ thống (vi phạm ràng buộc duy nhất).' });
    return;
  }

  // 2. FOREIGN KEY constraint
  if (errMsg.includes('FOREIGN KEY constraint failed')) {
    res.status(409).json({
      success: false,
      message: 'Không thể thực hiện thao tác do ràng buộc dữ liệu liên quan (danh mục hoặc đối tác không tồn tại, hoặc đang có dữ liệu phụ thuộc không thể xóa).'
    });
    return;
  }

  // 3. CHECK constraint
  if (errMsg.includes('CHECK constraint failed')) {
    res.status(400).json({
      success: false,
      message: 'Dữ liệu không thỏa mãn điều kiện hợp lệ (giá bán, giá vốn, số lượng hoặc định mức phải lớn hơn hoặc bằng 0).'
    });
    return;
  }

  // Lỗi mặc định 500
  res.status(500).json({
    success: false,
    message: defaultMessage
  });
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SERVER_CONFIG } from '../config.js';
import db from '../../db/database.js';
import { AuthUser, UserRole } from '../../types/accounting.js';

// Mở rộng kiểu dữ liệu Request của Express để chứa user đã xác thực
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface JwtPayload {
  id: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Middleware xác thực JWT Token
 * - Lấy token từ header Authorization: Bearer <token>
 * - Kiểm tra chữ ký & hạn sử dụng
 * - Truy vấn cơ sở dữ liệu để lấy thông tin người dùng và quyền hạn thực tế
 * - Gắn thông tin người dùng vào req.user
 */
export function authenticateToken(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Yêu cầu xác thực: Thiếu Authorization token.'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, SERVER_CONFIG.JWT_SECRET) as JwtPayload;

    // Truy vấn database thật để đảm bảo tài khoản còn tồn tại và đang hoạt động
    const userRow = db.prepare(`
      SELECT id, username, name, role, role_title, email, phone, avatar, branch, is_active
      FROM users 
      WHERE id = ?
    `).get(decoded.id) as any;

    if (!userRow) {
      res.status(401).json({
        success: false,
        error: 'Tài khoản người dùng không còn tồn tại trong hệ thống.'
      });
      return;
    }

    if (userRow.is_active !== 1) {
      res.status(401).json({
        success: false,
        error: 'Tài khoản người dùng hiện đang bị tạm khóa.'
      });
      return;
    }

    // Gắn thông tin người dùng an toàn (tuyệt đối không lấy role từ frontend)
    req.user = {
      id: userRow.id,
      username: decoded.username || userRow.username,
      name: userRow.name,
      role: userRow.role as UserRole,
      roleTitle: userRow.role_title,
      email: userRow.email,
      phone: userRow.phone,
      avatar: userRow.avatar || '👤',
      branch: userRow.branch
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: 'Token xác thực không hợp lệ hoặc đã hết hạn.'
    });
    return;
  }
}

/**
 * Middleware phân quyền theo Role (RBAC)
 * Kiểm tra role thực tế của user trong Database có thuộc danh sách cho phép không
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Yêu cầu đăng nhập để truy cập tài nguyên này.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Bạn không có quyền truy cập chức năng này.'
      });
      return;
    }

    next();
  };
}

/**
 * Middleware phân quyền theo điều kiện hàm (Dynamic Permission)
 */
export function requirePermission(checker: (user: AuthUser) => boolean) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Yêu cầu đăng nhập để truy cập tài nguyên này.'
      });
      return;
    }

    if (!checker(req.user)) {
      res.status(403).json({
        success: false,
        error: 'Bạn không có quyền thực hiện hành động này.'
      });
      return;
    }

    next();
  };
}

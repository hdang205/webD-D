import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SERVER_CONFIG } from '../config.js';
import db from '../../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AuthUser, UserRole } from '../../types/accounting.js';

/**
 * Xử lý đăng nhập hệ thống
 * POST /api/auth/login
 */
export function login(req: Request, res: Response): void {
  // Đảm bảo response luôn là JSON
  res.setHeader('Content-Type', 'application/json');

  try {
    const { username, password } = req.body || {};

    // 1. Validate dữ liệu đầu vào (HTTP 400)
    if (username === undefined || password === undefined) {
      res.status(400).json({
        success: false,
        message: 'Tên đăng nhập và mật khẩu là bắt buộc.',
        error: 'Tên đăng nhập và mật khẩu là bắt buộc.'
      });
      return;
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Tên đăng nhập và mật khẩu không hợp lệ.',
        error: 'Tên đăng nhập và mật khẩu không hợp lệ.'
      });
      return;
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      res.status(400).json({
        success: false,
        message: 'Tên đăng nhập và mật khẩu là bắt buộc.',
        error: 'Tên đăng nhập và mật khẩu không được để trống.'
      });
      return;
    }

    // 2. Tìm người dùng trong database theo username hoặc email
    const userRow = db.prepare(`
      SELECT id, username, password_hash, name, role, role_title, email, phone, avatar, branch, is_active
      FROM users
      WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(cleanUsername, cleanUsername) as any;

    if (!userRow) {
      // Thông báo an toàn, không tiết lộ user có tồn tại hay không (HTTP 401)
      res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác.',
        error: 'Thông tin đăng nhập không chính xác.'
      });
      return;
    }

    // 3. Kiểm tra trạng thái tài khoản
    if (userRow.is_active !== 1) {
      res.status(401).json({
        success: false,
        message: 'Tài khoản người dùng hiện đang bị tạm khóa.',
        error: 'Tài khoản người dùng hiện đang bị tạm khóa.'
      });
      return;
    }

    // 4. So khớp mật khẩu bằng bcryptjs
    const isPasswordValid = bcrypt.compareSync(cleanPassword, userRow.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác.',
        error: 'Thông tin đăng nhập không chính xác.'
      });
      return;
    }

    // 5. Tạo JWT Token bảo mật
    const token = jwt.sign(
      {
        id: userRow.id,
        username: userRow.username,
        role: userRow.role
      },
      SERVER_CONFIG.JWT_SECRET,
      { expiresIn: SERVER_CONFIG.JWT_EXPIRES_IN as any }
    );

    // 6. Trả về thông tin user (TUYỆT ĐỐI KHÔNG trả password_hash)
    const safeUser: AuthUser & { fullName?: string } = {
      id: userRow.id,
      username: userRow.username,
      name: userRow.name,
      fullName: userRow.name,
      role: userRow.role as UserRole,
      roleTitle: userRow.role_title,
      email: userRow.email,
      phone: userRow.phone,
      avatar: userRow.avatar || '👤',
      branch: userRow.branch
    };

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      user: safeUser
    });
  } catch (error: any) {
    console.error('Lỗi API Login:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi máy chủ.',
      error: 'Có lỗi xảy ra trong quá trình xử lý đăng nhập.'
    });
  }
}

/**
 * Lấy thông tin tài khoản hiện tại từ Token
 * GET /api/auth/me
 */
export function getCurrentUser(req: AuthenticatedRequest, res: Response): void {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng.',
        error: 'Chưa xác thực người dùng.'
      });
      return;
    }

    const safeUser = {
      ...req.user,
      fullName: req.user.name
    };

    res.status(200).json({
      success: true,
      user: safeUser
    });
  } catch (error: any) {
    console.error('Lỗi API getCurrentUser:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi máy chủ.'
    });
  }
}

/**
 * Đăng xuất
 * POST /api/auth/logout
 */
export function logout(_req: Request, res: Response): void {
  res.setHeader('Content-Type', 'application/json');

  res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công khỏi hệ thống.'
  });
}


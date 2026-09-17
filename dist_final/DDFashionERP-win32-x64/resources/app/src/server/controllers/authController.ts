import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SERVER_CONFIG } from '../config.js';
import db from '../../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AuthUser, UserRole } from '../../types/accounting.js';

/**
 * Bảng ánh xạ bí danh (alias) tên đăng nhập nhằm đảm bảo tương thích ngược
 * giữa tên đăng nhập thân thiện mới (VD: quanly_duyen) và mã kiểm thử cũ (VD: director_dung)
 */
export const USERNAME_ALIASES: Record<string, string> = {
  // Quản lý cửa hàng / Giám đốc: Lê Thị Duyên
  'director_dung': 'quanly_duyen',
  'quanly_duyen': 'director_dung',

  // Kế toán trưởng: Đàm Thị Thùy Dung
  'cpa_trang': 'ketoan_dung',
  'ketoan_dung': 'cpa_trang',

  // Nhân viên bán hàng & POS: Đặng Trà My
  'sales_lan': 'banhang_my',
  'banhang_my': 'sales_lan',

  // Nhân viên mua hàng: Trần Thanh Phong
  'muahang_dat': 'muahang_phong',
  'muahang_phong': 'muahang_dat',

  // Thủ kho & Quản lý kho: Chu Ngọc Hải
  'wh_hung': 'thukho_hai',
  'thukho_hai': 'wh_hung'
};

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

    const aliasUsername = USERNAME_ALIASES[cleanUsername.toLowerCase()] || cleanUsername;

    // 2. Tìm người dùng trong database theo username, alias hoặc email
    const userRow = db.prepare(`
      SELECT id, username, password_hash, name, role, role_title, email, phone, avatar, branch, is_active
      FROM users
      WHERE LOWER(username) = LOWER(?) OR LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(cleanUsername, aliasUsername, cleanUsername) as any;

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

    // Giữ nguyên username mà client gửi nếu khớp với alias để đảm bảo tương thích
    const effectiveUsername = (cleanUsername.toLowerCase() === userRow.username.toLowerCase() || 
      cleanUsername.toLowerCase() === aliasUsername.toLowerCase())
      ? cleanUsername
      : userRow.username;

    // 5. Tạo JWT Token bảo mật
    const token = jwt.sign(
      {
        id: userRow.id,
        username: effectiveUsername,
        role: userRow.role
      },
      SERVER_CONFIG.JWT_SECRET,
      { expiresIn: SERVER_CONFIG.JWT_EXPIRES_IN as any }
    );

    // 6. Trả về thông tin user (TUYỆT ĐỐI KHÔNG trả password_hash)
    const safeUser: AuthUser & { fullName?: string } = {
      id: userRow.id,
      username: effectiveUsername,
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

/**
 * Đổi mật khẩu tài khoản người dùng
 * PUT /api/auth/password
 */
export function changePassword(req: AuthenticatedRequest, res: Response): void {
  res.setHeader('Content-Type', 'application/json');

  try {
    // 1. Kiểm tra xác thực - Lấy user id từ authenticated session/token, TUYỆT ĐỐI không lấy từ client body
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập để thực hiện đổi mật khẩu.',
        error: 'Chưa xác thực người dùng.'
      });
      return;
    }

    const { currentPassword, newPassword } = req.body || {};

    // 2. Validate dữ liệu đầu vào
    if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc.',
        error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc.'
      });
      return;
    }

    const cleanCurrent = currentPassword.trim();
    const cleanNew = newPassword.trim();

    if (!cleanCurrent || !cleanNew) {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu không được để trống.',
        error: 'Mật khẩu không được để trống.'
      });
      return;
    }

    // Kiểm tra độ dài mật khẩu mới (tối thiểu 6 ký tự)
    if (cleanNew.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.',
        error: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.'
      });
      return;
    }

    // Không cho phép mật khẩu mới trùng mật khẩu cũ
    if (cleanNew === cleanCurrent) {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
        error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
      });
      return;
    }

    // 3. Truy vấn SQLite lấy thông tin password_hash hiện tại của user
    const userRow = db.prepare(`
      SELECT id, username, password_hash, is_active
      FROM users
      WHERE id = ?
    `).get(req.user.id) as any;

    if (!userRow) {
      res.status(404).json({
        success: false,
        message: 'Tài khoản người dùng không tồn tại trong hệ thống.',
        error: 'Tài khoản người dùng không tồn tại.'
      });
      return;
    }

    if (userRow.is_active !== 1) {
      res.status(403).json({
        success: false,
        message: 'Tài khoản người dùng hiện đang bị tạm khóa.',
        error: 'Tài khoản bị tạm khóa.'
      });
      return;
    }

    // 4. So khớp mật khẩu hiện tại bằng bcrypt
    const isCurrentValid = bcrypt.compareSync(cleanCurrent, userRow.password_hash);
    if (!isCurrentValid) {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.',
        error: 'Mật khẩu hiện tại không chính xác.'
      });
      return;
    }

    // 5. Băm mật khẩu mới bằng bcrypt (không lưu plaintext)
    const newPasswordHash = bcrypt.hashSync(cleanNew, 10);

    // 6. Cập nhật password_hash vào cơ sở dữ liệu SQLite
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newPasswordHash, req.user.id);

    // 7. Trả về thành công (TUYỆT ĐỐI KHÔNG trả về password_hash hay password)
    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công.'
    });
  } catch (error: any) {
    console.error('Lỗi API changePassword:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi máy chủ khi đổi mật khẩu.',
      error: 'Có lỗi xảy ra trong quá trình đổi mật khẩu.'
    });
  }
}


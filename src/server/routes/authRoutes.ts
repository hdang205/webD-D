import { Router } from 'express';
import { login, getCurrentUser, logout, changePassword } from '../controllers/authController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Endpoint xác thực đăng nhập
router.post('/login', login);

// Endpoint lấy thông tin người dùng hiện tại (Yêu cầu Authentication Token)
router.get('/me', authenticateToken, getCurrentUser);

// Endpoint đăng xuất
router.post('/logout', logout);

// Endpoint đổi mật khẩu tài khoản hiện tại (Yêu cầu Authentication Token)
router.put('/password', authenticateToken, changePassword);

// Endpoint kiểm tra phân quyền RBAC: Chỉ dành cho Giám đốc
router.get('/test-role-director', authenticateToken, requireRole('DIRECTOR'), (req: any, res) => {
  res.status(200).json({
    success: true,
    message: 'Xác thực phân quyền thành công: Bạn là Giám Đốc.',
    user: req.user
  });
});

// Endpoint kiểm tra phân quyền RBAC: Chỉ dành cho Kế toán trưởng
router.get('/test-role-accountant', authenticateToken, requireRole('CHIEF_ACCOUNTANT'), (req: any, res) => {
  res.status(200).json({
    success: true,
    message: 'Xác thực phân quyền thành công: Bạn là Kế Toán Trưởng.',
    user: req.user
  });
});

export default router;

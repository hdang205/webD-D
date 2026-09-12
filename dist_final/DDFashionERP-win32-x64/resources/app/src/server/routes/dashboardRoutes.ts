import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = Router();

// Yêu cầu xác thực JWT
router.use(authenticateToken);

// GET /api/dashboard - Thống kê tổng quan hệ thống D&D Fashion
router.get('/', getDashboardStats);

export default router;

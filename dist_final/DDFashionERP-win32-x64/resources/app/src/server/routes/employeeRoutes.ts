import { Router } from 'express';
import { 
  getEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee 
} from '../controllers/employeeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Yêu cầu đăng nhập
router.use(authenticateToken);

// Đọc danh sách và chi tiết nhân sự
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);

// Thao tác quản lý nhân sự (yêu cầu quyền Giám Đốc hoặc Kế Toán Trưởng)
router.post('/', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'), createEmployee);
router.put('/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'), updateEmployee);
router.delete('/:id', requireRole('DIRECTOR', 'CHIEF_ACCOUNTANT'), deleteEmployee);

export default router;

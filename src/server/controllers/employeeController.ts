import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../db/database.js';
import { handleDbError } from '../utils/dbErrors.js';

const PHONE_REGEX = /^[0-9+.\s-]{9,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_ROLES = [
  'DIRECTOR',
  'CHIEF_ACCOUNTANT',
  'WAREHOUSE_MANAGER',
  'SALES_CASHIER',
  'PURCHASING_STAFF',
  'SALES_STAFF',
  'STAFF'
];

const VALID_DEPARTMENTS = [
  'SALES_POS',
  'PURCHASING',
  'ACCOUNTING',
  'WAREHOUSE',
  'MANAGEMENT',
  'MARKETING_DESIGN'
];

/**
 * Format Employee record from SQLite row to frontend CamelCase object
 * (TUYỆT ĐỐI KHÔNG chứa password_hash)
 */
function formatEmployee(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    username: row.username || '',
    name: row.name,
    gender: row.gender || 'OTHER',
    birthday: row.birthday || '',
    idCardNumber: row.id_card_number || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    department: row.department,
    position: row.position,
    role: row.role,
    branch: row.branch,
    avatar: row.avatar || '👤',
    startDate: row.start_date,
    baseSalary: row.base_salary || 0,
    allowance: row.allowance || 0,
    commissionRate: row.commission_rate || 0,
    insuranceSalary: row.insurance_salary || 0,
    bankAccount: row.bank_account || '',
    bankName: row.bank_name || '',
    status: row.status || 'ACTIVE',
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

/**
 * Lấy danh sách nhân viên
 * GET /api/employees?search=...&department=...&status=...
 */
export function getEmployees(req: Request, res: Response): void {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    let sql = `
      SELECT 
        e.*,
        u.username
      FROM employees e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (e.name LIKE ? OR e.code LIKE ? OR e.phone LIKE ? OR e.email LIKE ? OR e.position LIKE ? OR u.username LIKE ?) `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    if (department && department !== 'ALL') {
      sql += ` AND e.department = ? `;
      params.push(department);
    }

    if (status && status !== 'ALL') {
      sql += ` AND e.status = ? `;
      params.push(status);
    }

    sql += ` ORDER BY e.created_at DESC `;

    const rows = db.prepare(sql).all(...params);

    res.status(200).json({
      success: true,
      data: rows.map(formatEmployee)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tải danh sách nhân viên');
  }
}

/**
 * Lấy thông tin chi tiết một nhân viên
 * GET /api/employees/:id
 */
export function getEmployeeById(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID nhân viên không hợp lệ' });
      return;
    }

    const row = db.prepare(`
      SELECT 
        e.*,
        u.username
      FROM employees e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.id = ? OR e.code = ?
    `).get(id, id);

    if (!row) {
      res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên' });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatEmployee(row)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi lấy thông tin nhân viên');
  }
}

/**
 * Thêm mới nhân sự & tài khoản người dùng
 * POST /api/employees
 */
export function createEmployee(req: Request, res: Response): void {
  try {
    const {
      code,
      name,
      username,
      password,
      gender,
      birthday,
      idCardNumber,
      phone,
      email,
      address,
      department,
      position,
      role,
      branch,
      avatar,
      startDate,
      baseSalary,
      allowance,
      commissionRate,
      insuranceSalary,
      bankAccount,
      bankName,
      status,
      notes
    } = req.body || {};

    const errors: Record<string, string> = {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Họ tên nhân viên là bắt buộc';
    }

    if (!username || typeof username !== 'string' || !username.trim()) {
      errors.username = 'Tên đăng nhập hệ thống là bắt buộc';
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      errors.phone = 'Số điện thoại là bắt buộc';
    } else if (!PHONE_REGEX.test(phone.trim())) {
      errors.phone = 'Số điện thoại không đúng định dạng';
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.email = 'Email là bắt buộc';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Email không đúng định dạng';
    }

    if (!department || !VALID_DEPARTMENTS.includes(department)) {
      errors.department = 'Phòng ban không hợp lệ';
    }

    if (!role || !VALID_ROLES.includes(role)) {
      errors.role = 'Vai trò hệ thống không hợp lệ';
    }

    const numBaseSalary = Number(baseSalary ?? 0);
    const numAllowance = Number(allowance ?? 0);
    const numCommission = Number(commissionRate ?? 0);
    const numInsurance = Number(insuranceSalary ?? 0);

    if (isNaN(numBaseSalary) || numBaseSalary < 0) errors.baseSalary = 'Lương cơ bản không hợp lệ';
    if (isNaN(numAllowance) || numAllowance < 0) errors.allowance = 'Phụ cấp không hợp lệ';
    if (isNaN(numCommission) || numCommission < 0) errors.commissionRate = 'Hoa hồng không hợp lệ';
    if (isNaN(numInsurance) || numInsurance < 0) errors.insuranceSalary = 'Mức lương BHXH không hợp lệ';

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu hồ sơ nhân viên không hợp lệ',
        errors
      });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    // Kiểm tra username đã tồn tại chưa
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: `Tên đăng nhập "${cleanUsername}" đã được sử dụng bởi nhân sự khác.`
      });
      return;
    }

    const cleanCode = (typeof code === 'string' && code.trim())
      ? code.trim().toUpperCase()
      : `NV${Date.now().toString().slice(-5)}`;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanPosition = (typeof position === 'string' && position.trim()) ? position.trim() : 'Nhân viên';
    const cleanBranch = (typeof branch === 'string' && branch.trim()) ? branch.trim() : 'Showroom 120 Phố Huế, Hà Nội';
    const cleanGender = (gender === 'MALE' || gender === 'FEMALE') ? gender : 'OTHER';
    const cleanStartDate = (typeof startDate === 'string' && startDate.trim()) ? startDate.trim() : new Date().toISOString().split('T')[0];
    const cleanStatus = (status === 'ON_LEAVE' || status === 'RESIGNED') ? status : 'ACTIVE';
    const cleanAvatar = typeof avatar === 'string' && avatar.trim() ? avatar.trim() : '👤';
    const cleanIdCard = typeof idCardNumber === 'string' ? idCardNumber.trim() : null;
    const cleanAddress = typeof address === 'string' ? address.trim() : null;
    const cleanBirthday = typeof birthday === 'string' ? birthday.trim() : null;
    const cleanBankAccount = typeof bankAccount === 'string' ? bankAccount.trim() : null;
    const cleanBankName = typeof bankName === 'string' ? bankName.trim() : null;
    const cleanNotes = typeof notes === 'string' ? notes.trim() : null;

    const empId = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userId = `usr_${empId}`;
    const rawPass = (typeof password === 'string' && password.trim()) ? password.trim() : '123456';
    const passwordHash = bcrypt.hashSync(rawPass, 10);

    // Sử dụng transaction để tạo đồng bộ cả user và employee
    const createTx = db.transaction(() => {
      // 1. Tạo User
      db.prepare(`
        INSERT INTO users (
          id, username, password_hash, name, role, role_title,
          email, phone, avatar, branch, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        userId,
        cleanUsername,
        passwordHash,
        cleanName,
        role,
        cleanPosition,
        cleanEmail,
        cleanPhone,
        cleanAvatar,
        cleanBranch
      );

      // 2. Tạo Employee
      db.prepare(`
        INSERT INTO employees (
          id, code, user_id, name, gender, birthday, id_card_number, phone, email, address,
          department, position, role, branch, avatar, start_date, base_salary, allowance,
          commission_rate, insurance_salary, bank_account, bank_name, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        empId,
        cleanCode,
        userId,
        cleanName,
        cleanGender,
        cleanBirthday,
        cleanIdCard,
        cleanPhone,
        cleanEmail,
        cleanAddress,
        department,
        cleanPosition,
        role,
        cleanBranch,
        cleanAvatar,
        cleanStartDate,
        numBaseSalary,
        numAllowance,
        numCommission,
        numInsurance,
        cleanBankAccount,
        cleanBankName,
        cleanStatus,
        cleanNotes
      );
    });

    createTx();

    const created = db.prepare(`
      SELECT e.*, u.username
      FROM employees e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.id = ?
    `).get(empId);

    res.status(201).json({
      success: true,
      message: 'Thêm mới nhân sự & tài khoản thành công',
      data: formatEmployee(created)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi tạo mới hồ sơ nhân viên');
  }
}

/**
 * Cập nhật hồ sơ nhân viên
 * PUT /api/employees/:id
 */
export function updateEmployee(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID nhân viên không hợp lệ' });
      return;
    }

    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên' });
      return;
    }

    const {
      code,
      name,
      gender,
      birthday,
      idCardNumber,
      phone,
      email,
      address,
      department,
      position,
      role,
      branch,
      avatar,
      startDate,
      baseSalary,
      allowance,
      commissionRate,
      insuranceSalary,
      bankAccount,
      bankName,
      status,
      notes,
      password
    } = req.body || {};

    const errors: Record<string, string> = {};

    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      errors.name = 'Họ tên nhân viên không được để trống';
    }

    if (phone !== undefined && (!phone || typeof phone !== 'string' || !phone.trim())) {
      errors.phone = 'Số điện thoại không được để trống';
    } else if (phone !== undefined && !PHONE_REGEX.test(String(phone).trim())) {
      errors.phone = 'Số điện thoại không đúng định dạng';
    }

    if (email !== undefined && (!email || typeof email !== 'string' || !email.trim())) {
      errors.email = 'Email không được để trống';
    } else if (email !== undefined && !EMAIL_REGEX.test(String(email).trim())) {
      errors.email = 'Email không đúng định dạng';
    }

    if (department !== undefined && !VALID_DEPARTMENTS.includes(department)) {
      errors.department = 'Phòng ban không hợp lệ';
    }

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      errors.role = 'Vai trò hệ thống không hợp lệ';
    }

    const numBaseSalary = baseSalary !== undefined ? Number(baseSalary) : existing.base_salary;
    const numAllowance = allowance !== undefined ? Number(allowance) : existing.allowance;
    const numCommission = commissionRate !== undefined ? Number(commissionRate) : existing.commission_rate;
    const numInsurance = insuranceSalary !== undefined ? Number(insuranceSalary) : existing.insurance_salary;

    if (isNaN(numBaseSalary) || numBaseSalary < 0) errors.baseSalary = 'Lương cơ bản không hợp lệ';
    if (isNaN(numAllowance) || numAllowance < 0) errors.allowance = 'Phụ cấp không hợp lệ';
    if (isNaN(numCommission) || numCommission < 0) errors.commissionRate = 'Hoa hồng không hợp lệ';
    if (isNaN(numInsurance) || numInsurance < 0) errors.insuranceSalary = 'Mức lương BHXH không hợp lệ';

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu cập nhật nhân viên không hợp lệ',
        errors
      });
      return;
    }

    const cleanCode = code !== undefined ? code.trim().toUpperCase() : existing.code;
    const cleanName = name !== undefined ? name.trim() : existing.name;
    const cleanPhone = phone !== undefined ? phone.trim() : existing.phone;
    const cleanEmail = email !== undefined ? email.trim() : existing.email;
    const cleanGender = gender !== undefined ? gender : existing.gender;
    const cleanBirthday = birthday !== undefined ? (birthday ? birthday.trim() : null) : existing.birthday;
    const cleanIdCard = idCardNumber !== undefined ? (idCardNumber ? idCardNumber.trim() : null) : existing.id_card_number;
    const cleanAddress = address !== undefined ? (address ? address.trim() : null) : existing.address;
    const cleanDept = department !== undefined ? department : existing.department;
    const cleanPos = position !== undefined ? position.trim() : existing.position;
    const cleanRole = role !== undefined ? role : existing.role;
    const cleanBranch = branch !== undefined ? branch.trim() : existing.branch;
    const cleanAvatar = avatar !== undefined ? (avatar ? avatar.trim() : '👤') : existing.avatar;
    const cleanStartDate = startDate !== undefined ? startDate.trim() : existing.start_date;
    const cleanStatus = status !== undefined ? status : existing.status;
    const cleanBankAccount = bankAccount !== undefined ? (bankAccount ? bankAccount.trim() : null) : existing.bank_account;
    const cleanBankName = bankName !== undefined ? (bankName ? bankName.trim() : null) : existing.bank_name;
    const cleanNotes = notes !== undefined ? (notes ? notes.trim() : null) : existing.notes;

    const updateTx = db.transaction(() => {
      // 1. Cập nhật bảng employees
      db.prepare(`
        UPDATE employees
        SET code = ?, name = ?, gender = ?, birthday = ?, id_card_number = ?,
            phone = ?, email = ?, address = ?, department = ?, position = ?,
            role = ?, branch = ?, avatar = ?, start_date = ?, base_salary = ?,
            allowance = ?, commission_rate = ?, insurance_salary = ?,
            bank_account = ?, bank_name = ?, status = ?, notes = ?
        WHERE id = ?
      `).run(
        cleanCode,
        cleanName,
        cleanGender,
        cleanBirthday,
        cleanIdCard,
        cleanPhone,
        cleanEmail,
        cleanAddress,
        cleanDept,
        cleanPos,
        cleanRole,
        cleanBranch,
        cleanAvatar,
        cleanStartDate,
        numBaseSalary,
        numAllowance,
        numCommission,
        numInsurance,
        cleanBankAccount,
        cleanBankName,
        cleanStatus,
        cleanNotes,
        id
      );

      // 2. Đồng bộ thông tin sang users nếu có user_id
      if (existing.user_id) {
        let userSql = `
          UPDATE users
          SET name = ?, role = ?, role_title = ?, email = ?, phone = ?, branch = ?, avatar = ?
        `;
        const userParams: any[] = [cleanName, cleanRole, cleanPos, cleanEmail, cleanPhone, cleanBranch, cleanAvatar];

        if (password && typeof password === 'string' && password.trim()) {
          userSql += `, password_hash = ? `;
          userParams.push(bcrypt.hashSync(password.trim(), 10));
        }

        userSql += ` WHERE id = ? `;
        userParams.push(existing.user_id);

        db.prepare(userSql).run(...userParams);
      }
    });

    updateTx();

    const updated = db.prepare(`
      SELECT e.*, u.username
      FROM employees e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.id = ?
    `).get(id);

    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ nhân viên thành công',
      data: formatEmployee(updated)
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi cập nhật nhân viên');
  }
}

/**
 * Xóa nhân viên & tài khoản liên kết
 * DELETE /api/employees/:id
 */
export function deleteEmployee(req: Request, res: Response): void {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'ID nhân viên không hợp lệ' });
      return;
    }

    const existing = db.prepare('SELECT id, name, code, user_id FROM employees WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' });
      return;
    }

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM employees WHERE id = ?').run(id);
      if (existing.user_id) {
        db.prepare('DELETE FROM users WHERE id = ?').run(existing.user_id);
      }
    });

    deleteTx();

    res.status(200).json({
      success: true,
      message: `Đã xóa nhân sự "${existing.name}" (${existing.code}) thành công`
    });
  } catch (error) {
    handleDbError(res, error, 'Lỗi khi xóa nhân viên');
  }
}

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Shield, 
  Calendar, 
  CreditCard, 
  FileText,
  Sparkles,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Employee, EmployeeDepartment, EmployeeStatus } from '../../types/accounting';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeData: Omit<Employee, 'id'> | Employee) => void;
  initialEmployee?: Employee | null;
  existingCodes: string[];
}

const EMOJI_AVATARS = ['👔', '👩‍💼', '📦', '🛍️', '👗', '🎨', '🧑‍💻', '💼', '💄', '👠', '✂️', '💎'];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEmployee,
  existingCodes
}) => {
  const isEditing = !!initialEmployee;

  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    code: '',
    name: '',
    gender: 'FEMALE',
    birthday: '1998-01-01',
    idCardNumber: '',
    phone: '',
    email: '',
    address: '',
    department: 'SALES_POS',
    position: 'Chuyên Viên Tư Vấn Thời Trang',
    role: 'STAFF',
    branch: 'Showroom 120 Phố Huế, Hà Nội',
    avatar: '👗',
    startDate: new Date().toISOString().split('T')[0],
    baseSalary: 8500000,
    allowance: 1200000,
    commissionRate: 1.5,
    insuranceSalary: 5500000,
    bankAccount: '',
    bankName: 'Techcombank',
    status: 'ACTIVE',
    username: '',
    notes: ''
  });

  const [activeTab, setActiveTab] = useState<'info' | 'salary' | 'system'>('info');
  const [error, setError] = useState<string | null>(null);

  // Generate next employee code
  const getNextCode = () => {
    let maxNum = 0;
    existingCodes.forEach(code => {
      const match = code.match(/NV(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `NV${String(maxNum + 1).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (initialEmployee) {
      setFormData({
        code: initialEmployee.code,
        name: initialEmployee.name,
        gender: initialEmployee.gender,
        birthday: initialEmployee.birthday || '1998-01-01',
        idCardNumber: initialEmployee.idCardNumber || '',
        phone: initialEmployee.phone,
        email: initialEmployee.email,
        address: initialEmployee.address || '',
        department: initialEmployee.department,
        position: initialEmployee.position,
        role: initialEmployee.role,
        branch: initialEmployee.branch,
        avatar: initialEmployee.avatar || '👩‍💼',
        startDate: initialEmployee.startDate,
        baseSalary: initialEmployee.baseSalary,
        allowance: initialEmployee.allowance,
        commissionRate: initialEmployee.commissionRate,
        insuranceSalary: initialEmployee.insuranceSalary || 5000000,
        bankAccount: initialEmployee.bankAccount || '',
        bankName: initialEmployee.bankName || 'Techcombank',
        status: initialEmployee.status,
        username: initialEmployee.username || '',
        notes: initialEmployee.notes || ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        code: getNextCode(),
        name: '',
        phone: '',
        email: '',
        username: '',
        notes: ''
      }));
    }
    setError(null);
    setActiveTab('info');
  }, [initialEmployee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập họ và tên nhân viên');
      setActiveTab('info');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Vui lòng nhập số điện thoại liên hệ');
      setActiveTab('info');
      return;
    }

    if (isEditing && initialEmployee) {
      onSave({ ...formData, id: initialEmployee.id });
    } else {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-rose-100 overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#fb6f92] to-[#a93054] text-white flex items-center justify-center text-xl shadow-xs">
              {formData.avatar || '👤'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isEditing ? `Chỉnh Sửa Nhân Sự: ${initialEmployee?.name}` : 'Thêm Nhân Viên Mới Vào Cửa Hàng'}
              </h3>
              <p className="text-xs text-[#a93054] font-medium">
                Cửa Hàng Thời Trang D&D • Quản lý nhân sự & Bảng lương
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-[#a93054] text-[#a93054]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Thông Tin & Vị Trí</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('salary')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'salary'
                ? 'border-[#a93054] text-[#a93054]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>2. Lương & Phúc Lợi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'system'
                ? 'border-[#a93054] text-[#a93054]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>3. Tài Khoản & Phân Quyền</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* TAB 1: THÔNG TIN CÁ NHÂN & VỊ TRÍ */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              {/* Avatar Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Biểu Tượng Avatar Nhận Diện
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_AVATARS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: emoji })}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition cursor-pointer ${
                        formData.avatar === emoji 
                          ? 'bg-[#ffe5ec] border-2 border-[#a93054] scale-110 shadow-xs' 
                          : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã Nhân Viên *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    placeholder="NV001"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ Và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    placeholder="VD: Nguyễn Thùy Linh"
                  />
                </div>
              </div>

              {/* Gender, Birthday & ID Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giới Tính
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  >
                    <option value="FEMALE">Nữ</option>
                    <option value="MALE">Nam</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày Sinh
                  </label>
                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số CCCD / CMND
                  </label>
                  <input
                    type="text"
                    value={formData.idCardNumber}
                    onChange={(e) => setFormData({ ...formData, idCardNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    placeholder="001198007321"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Điện Thoại Liên Hệ *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                      placeholder="0966 888 777"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Công Việc
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                      placeholder="linh.pos@dndfashion.vn"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa Chỉ Thường Trú / Tạm Trú
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    placeholder="VD: 15 Trần Phú, Ba Đình, Hà Nội"
                  />
                </div>
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phòng Ban / Bộ Phận *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      const dept = e.target.value as EmployeeDepartment;
                      let defPosition = formData.position;
                      let defRole = formData.role;
                      if (dept === 'SALES_POS') {
                        defPosition = 'Thu Ngân & Tư Vấn Bán Hàng';
                        defRole = 'SALES_CASHIER';
                      } else if (dept === 'ACCOUNTING') {
                        defPosition = 'Kế Toán Viên';
                        defRole = 'CHIEF_ACCOUNTANT';
                      } else if (dept === 'WAREHOUSE') {
                        defPosition = 'Nhân Viên Thủ Kho';
                        defRole = 'WAREHOUSE_MANAGER';
                      } else if (dept === 'MANAGEMENT') {
                        defPosition = 'Quản Lý Cửa Hàng';
                        defRole = 'DIRECTOR';
                      } else {
                        defPosition = 'Chuyên Viên Thiết Kế BST';
                        defRole = 'STAFF';
                      }
                      setFormData({ ...formData, department: dept, position: defPosition, role: defRole });
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92] font-semibold text-slate-800"
                  >
                    <option value="SALES_POS">🛍️ Showroom & Thu Ngân POS</option>
                    <option value="ACCOUNTING">📊 Kế Toán - Tài Chính (VAS)</option>
                    <option value="WAREHOUSE">📦 Kho Vận & Thủ Quỹ</option>
                    <option value="MANAGEMENT">👔 Ban Giám Đốc & Quản Lý</option>
                    <option value="MARKETING_DESIGN">🎨 Thiết Kế Lookbook & Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chức Danh / Vị Trí Làm Việc *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    placeholder="VD: Trưởng Ca Thu Ngân"
                  />
                </div>
              </div>

              {/* Branch, StartDate & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chi Nhánh Trực Thuộc
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    placeholder="Showroom 120 Phố Huế"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày Bắt Đầu Làm
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trạng Thái Làm Việc
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92] font-semibold"
                  >
                    <option value="ACTIVE">🟢 Đang Làm Việc</option>
                    <option value="ON_LEAVE">🟡 Tạm Nghỉ / Nghỉ Phép</option>
                    <option value="RESIGNED">🔴 Đã Thôi Việc</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LƯƠNG & PHÚC LỢI */}
          {activeTab === 'salary' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-100 text-xs text-[#a93054] flex items-center gap-2">
                <DollarSign className="w-4 h-4 shrink-0" />
                <span>Hạch toán quỹ lương tháng theo Tài khoản Kế toán TT133 & TT200 (TK 334 / 6421 / 6411).</span>
              </div>

              {/* Base Salary & Allowance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lương Cơ Bản Hàng Tháng (VND) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={500000}
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">VNĐ</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hiển thị: {(formData.baseSalary).toLocaleString('vi-VN')} đ
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phụ Cấp (Ăn trưa, xăng xe, điện thoại)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={100000}
                      value={formData.allowance}
                      onChange={(e) => setFormData({ ...formData, allowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">VNĐ</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hiển thị: {(formData.allowance).toLocaleString('vi-VN')} đ
                  </p>
                </div>
              </div>

              {/* Commission Rate & Insurance Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tỷ Lệ Hoa Hồng Bán Hàng (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">% DT</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tự động tính hoa hồng trên các đơn hàng POS/Online do NV phụ trách
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mức Lương Đóng BHXH / BHYT (VND)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={500000}
                      value={formData.insuranceSalary}
                      onChange={(e) => setFormData({ ...formData, insuranceSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">VNĐ</span>
                  </div>
                </div>
              </div>

              {/* Bank Account Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Tài Khoản Ngân Hàng
                  </label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                      placeholder="1903888291001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Ngân Hàng Nhận Lương
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    placeholder="Techcombank / Vietcombank / MB"
                  />
                </div>
              </div>

              {/* Salary Preview Box */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Thu Nhập Dự Tính Cứng (Chưa gồm hoa hồng)
                  </span>
                  <div className="text-base font-extrabold text-[#a93054]">
                    {((formData.baseSalary || 0) + (formData.allowance || 0)).toLocaleString('vi-VN')} đ/tháng
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>+ {formData.commissionRate}% Hoa hồng doanh thu</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TÀI KHOẢN & PHÂN QUYỀN HỆ THỐNG */}
          {activeTab === 'system' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-700" />
                <span>Thiết lập vai trò phân quyền quyết định tính năng nhân viên có thể xem và thao tác.</span>
              </div>

              {/* System Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Vai Trò & Quyền Hạn Trong Hệ Thống (ERP / POS) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'DIRECTOR',
                      title: 'Tổng Giám Đốc (Toàn quyền)',
                      desc: 'Xem báo cáo tài chính, duyệt sổ sách, xuất dữ liệu, quản lý nhân sự & cài đặt',
                      badge: 'Toàn quyền',
                      icon: '👔'
                    },
                    {
                      id: 'CHIEF_ACCOUNTANT',
                      title: 'Kế Toán Trưởng CPA',
                      desc: 'Lập phiếu thu/chi, hóa đơn VAT, sổ quỹ, sổ nhật ký chung TT133 & TT200',
                      badge: 'Sổ sách & Thuế',
                      icon: '👩‍💼'
                    },
                    {
                      id: 'WAREHOUSE_MANAGER',
                      title: 'Quản Lý Kho & Thủ Quỹ',
                      desc: 'Nhập xuất tồn kho đầm thời trang, kiểm kê tồn kho và đối soát quỹ tiền mặt',
                      badge: 'Kho hàng & Quỹ',
                      icon: '📦'
                    },
                    {
                      id: 'SALES_CASHIER',
                      title: 'Thu Ngân & Bán Hàng POS',
                      desc: 'Bán hàng tại quầy POS, in bill hóa đơn, tạo đơn online và xem khách VIP',
                      badge: 'Bán lẻ POS',
                      icon: '🛍️'
                    },
                    {
                      id: 'STAFF',
                      title: 'Nhân Viên Tiêu Chuẩn',
                      desc: 'Xem danh mục sản phẩm mẫu đầm, tra cứu khách hàng VIP và kiểm tra tồn kho',
                      badge: 'Xem dữ liệu',
                      icon: '👗'
                    }
                  ].map(roleItem => (
                    <div
                      key={roleItem.id}
                      onClick={() => setFormData({ ...formData, role: roleItem.id as any })}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 ${
                        formData.role === roleItem.id
                          ? 'bg-rose-50/80 border-[#a93054] shadow-xs'
                          : 'bg-white border-slate-200 hover:border-pink-300'
                      }`}
                    >
                      <span className="text-xl">{roleItem.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{roleItem.title}</span>
                          {formData.role === roleItem.id && (
                            <CheckCircle2 className="w-4 h-4 text-[#a93054]" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{roleItem.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Username for login */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Đăng Nhập (Username)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    placeholder="VD: linh_salespos"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Dùng để đăng nhập vào phân hệ POS hoặc Kế toán D&D Fashion
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú Nhân Sự & Quyết Định Tiếp Nhận
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  placeholder="Thông tin bằng cấp, kinh nghiệm, ca làm việc showroom..."
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Bước <strong className="text-slate-800">{activeTab === 'info' ? '1/3' : activeTab === 'salary' ? '2/3' : '3/3'}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>

              {activeTab !== 'system' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'info' ? 'salary' : 'system')}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer"
                >
                  Tiếp tục →
                </button>
              ) : null}

              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-[#fb6f92] to-[#a93054] hover:opacity-95 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

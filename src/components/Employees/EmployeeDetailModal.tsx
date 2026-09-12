import React from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Shield, 
  Building2, 
  CreditCard, 
  Award,
  Clock,
  Printer,
  Edit2,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { Employee, Invoice } from '../../types/accounting';

interface EmployeeDetailModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  invoices?: Invoice[];
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  invoices = []
}) => {
  if (!isOpen || !employee) return null;

  // Calculate estimated commission if this employee is linked to sales
  const salesCount = invoices.filter(inv => inv.type === 'SALES').length;
  const sampleSalesRevenue = employee.department === 'SALES_POS' ? 68500000 : 0;
  const calculatedCommission = Math.round((sampleSalesRevenue * (employee.commissionRate || 0)) / 100);
  const totalMonthlyIncome = employee.baseSalary + (employee.allowance || 0) + calculatedCommission;

  const getDepartmentName = (dept: string) => {
    switch (dept) {
      case 'SALES_POS': return '🛍️ Showroom & Thu Ngân POS';
      case 'ACCOUNTING': return '📊 Kế Toán - Tài Chính (VAS)';
      case 'WAREHOUSE': return '📦 Kho Vận & Thủ Quỹ';
      case 'MANAGEMENT': return '👔 Ban Giám Đốc & Quản Lý';
      case 'MARKETING_DESIGN': return '🎨 Thiết Kế Lookbook & Marketing';
      default: return dept;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'DIRECTOR': return 'Tổng Giám Đốc';
      case 'CHIEF_ACCOUNTANT': return 'Kế Toán Trưởng CPA';
      case 'WAREHOUSE_MANAGER': return 'Quản Lý Kho & Thủ Quỹ';
      case 'SALES_CASHIER': return 'Trưởng Ca Thu Ngân POS';
      default: return 'Nhân Viên Tiêu Chuẩn';
    }
  };

  const handlePrintSalarySlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-rose-100 overflow-hidden my-auto">
        
        {/* Header Profile Banner */}
        <div className="p-6 bg-gradient-to-r from-rose-100 via-pink-50 to-rose-50 border-b border-rose-100 flex items-start justify-between relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fb6f92] to-[#a93054] text-white flex items-center justify-center text-3xl shadow-md border-2 border-white">
              {employee.avatar || '👤'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">{employee.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 bg-white/80 rounded-lg text-[#a93054] font-bold border border-rose-200">
                  {employee.code}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  employee.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : employee.status === 'ON_LEAVE'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {employee.status === 'ACTIVE' ? 'Đang làm việc' : employee.status === 'ON_LEAVE' ? 'Tạm nghỉ' : 'Đã thôi việc'}
                </span>
              </div>
              <p className="text-xs font-bold text-[#a93054] mt-0.5">
                {employee.position} • {getDepartmentName(employee.department)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.branch}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Vào làm: {employee.startDate}</span>
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

        {/* Dossier Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Contact & Personal Info Card */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#a93054]" />
              <span>Thông Tin Cá Nhân & Liên Hệ</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Điện thoại:</span>
                <strong className="text-slate-800">{employee.phone}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Email:</span>
                <strong className="text-slate-800 truncate">{employee.email || 'Chưa cập nhật'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Ngày sinh:</span>
                <strong className="text-slate-800">{employee.birthday || 'Chưa rõ'} ({employee.gender === 'MALE' ? 'Nam' : 'Nữ'})</strong>
              </div>

              <div className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Số CCCD/CMND:</span>
                <strong className="text-slate-800 font-mono">{employee.idCardNumber || 'Chưa nhập'}</strong>
              </div>

              <div className="sm:col-span-2 flex items-start gap-2 pt-1 border-t border-slate-200/60">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-500 shrink-0">Địa chỉ:</span>
                <span className="text-slate-800 font-medium">{employee.address || '120 Phố Huế, Q. Hai Bà Trưng, Hà Nội'}</span>
              </div>
            </div>
          </div>

          {/* Payroll & Compensation Breakdown */}
          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#a93054] uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-[#a93054]" />
                <span>Bảng Lương Tháng & Hoa Hồng (TK 334 / 6421)</span>
              </h4>
              <span className="text-[10px] bg-[#ffe5ec] text-[#a93054] px-2 py-0.5 rounded-full font-bold">
                Kỳ T8/2026
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-pink-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Lương cơ bản</span>
                <strong className="text-xs text-slate-900 block mt-0.5">
                  {(employee.baseSalary).toLocaleString('vi-VN')} đ
                </strong>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-pink-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Phụ cấp</span>
                <strong className="text-xs text-slate-900 block mt-0.5">
                  {(employee.allowance || 0).toLocaleString('vi-VN')} đ
                </strong>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-pink-100 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Hoa hồng ({employee.commissionRate}%)</span>
                <strong className="text-xs text-emerald-700 block mt-0.5">
                  +{calculatedCommission.toLocaleString('vi-VN')} đ
                </strong>
              </div>

              <div className="bg-gradient-to-br from-[#ffe5ec] to-[#fcddec] p-2.5 rounded-xl border border-rose-200 shadow-2xs">
                <span className="text-[10px] text-[#a93054] font-bold block">Thực lĩnh dự tính</span>
                <strong className="text-xs font-extrabold text-[#a93054] block mt-0.5">
                  {totalMonthlyIncome.toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>

            {/* Bank details */}
            <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-rose-100/80 text-slate-600">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>TK nhận lương:</span>
                <strong className="font-mono text-slate-800">{employee.bankAccount || 'Chưa cập nhật'}</strong>
                <span>({employee.bankName || 'Ngân hàng'})</span>
              </div>
              <div className="text-[11px] text-slate-500">
                BHXH cơ sở: <strong>{(employee.insuranceSalary || 5000000).toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>
          </div>

          {/* System Account & Access Matrix */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#a93054]" />
              <span>Tài Khoản Hệ Thống & Quyền Hạn</span>
            </h4>

            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Tên đăng nhập: </span>
                <strong className="font-mono text-[#a93054]">@{employee.username || employee.code.toLowerCase()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Cấp bậc quyền: </span>
                <strong className="text-slate-800">{getRoleName(employee.role)}</strong>
              </div>
            </div>

            {employee.notes && (
              <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mt-2 italic">
                "{employee.notes}"
              </p>
            )}
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Bạn có chắc chắn muốn xóa nhân viên ${employee.name} (${employee.code}) khỏi hệ thống?`)) {
                onDelete(employee.id);
                onClose();
              }
            }}
            className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100/80 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa nhân viên</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSalarySlip}
              className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>In Phiếu Lương</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(employee);
              }}
              className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white rounded-xl shadow-xs hover:opacity-95 transition cursor-pointer flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Chỉnh Sửa Hồ Sơ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

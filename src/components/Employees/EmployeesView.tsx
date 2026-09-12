import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  DollarSign, 
  Building2, 
  Shield, 
  Phone, 
  Mail, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileSpreadsheet, 
  Printer, 
  Sparkles,
  ChevronRight,
  Receipt,
  Download,
  CreditCard
} from 'lucide-react';
import { Employee, EmployeeDepartment, EmployeeStatus, Invoice, CashTransaction } from '../../types/accounting';
import { EmployeeModal } from './EmployeeModal';
import { EmployeeDetailModal } from './EmployeeDetailModal';

interface EmployeesViewProps {
  employees: Employee[];
  invoices: Invoice[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onOpenCashPayment?: (amount: number, reason: string, recipientName: string) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  invoices,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onOpenCashPayment
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'list' | 'payroll'>('list');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

  // Filter logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = selectedDept === 'ALL' || emp.department === selectedDept;
      const matchStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;

      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, searchTerm, selectedDept, selectedStatus]);

  // Statistics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
  const salesPosEmployees = employees.filter(e => e.department === 'SALES_POS').length;
  const totalBaseSalary = employees.reduce((sum, e) => sum + (e.status === 'ACTIVE' ? e.baseSalary : 0), 0);
  const totalAllowance = employees.reduce((sum, e) => sum + (e.status === 'ACTIVE' ? (e.allowance || 0) : 0), 0);
  const totalEstimatedPayroll = totalBaseSalary + totalAllowance;

  // Department metadata
  const getDepartmentInfo = (dept: EmployeeDepartment) => {
    switch (dept) {
      case 'SALES_POS':
        return { label: 'Showroom & Thu Ngân POS', icon: '🛍️', color: 'bg-pink-100 text-[#a93054]' };
      case 'ACCOUNTING':
        return { label: 'Kế Toán - Tài Chính (VAS)', icon: '📊', color: 'bg-blue-100 text-blue-800' };
      case 'WAREHOUSE':
        return { label: 'Kho Vận & Thủ Quỹ', icon: '📦', color: 'bg-amber-100 text-amber-800' };
      case 'MANAGEMENT':
        return { label: 'Ban Giám Đốc & Quản Lý', icon: '👔', color: 'bg-purple-100 text-purple-800' };
      case 'MARKETING_DESIGN':
        return { label: 'Thiết Kế Lookbook & BST', icon: '🎨', color: 'bg-emerald-100 text-emerald-800' };
      default:
        return { label: dept, icon: '🏢', color: 'bg-slate-100 text-slate-800' };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'DIRECTOR':
        return { label: 'Tổng Giám Đốc', class: 'bg-purple-100 text-purple-900 border-purple-200' };
      case 'CHIEF_ACCOUNTANT':
        return { label: 'Kế Toán Trưởng', class: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'WAREHOUSE_MANAGER':
        return { label: 'Quản Lý Kho', class: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'SALES_CASHIER':
        return { label: 'Thu Ngân POS', class: 'bg-pink-100 text-[#a93054] border-pink-200' };
      default:
        return { label: 'Nhân Viên', class: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Mã NV', 'Họ Tên', 'Giới Tính', 'SĐT', 'Email', 'Phòng Ban', 'Chức Vụ', 'Lương Cơ Bản', 'Phụ Cấp', '% Hoa Hồng', 'STK Ngân Hàng', 'Trạng Thái'];
    const rows = employees.map(e => [
      e.code,
      `"${e.name}"`,
      e.gender === 'FEMALE' ? 'Nữ' : 'Nam',
      `"${e.phone}"`,
      `"${e.email}"`,
      `"${getDepartmentInfo(e.department).label}"`,
      `"${e.position}"`,
      e.baseSalary,
      e.allowance || 0,
      `${e.commissionRate}%`,
      `"${e.bankAccount} (${e.bankName})"`,
      e.status === 'ACTIVE' ? 'Đang làm việc' : e.status === 'ON_LEAVE' ? 'Tạm nghỉ' : 'Đã thôi việc'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DanhSachNhanSu_DND_Fashion_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-[#fb6f92] to-[#a93054] text-white rounded-2xl shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Quản Lý Nhân Sự & Đội Ngũ Cửa Hàng</h2>
              <p className="text-xs text-slate-500">
                Thêm, sửa, xóa nhân viên, phân quyền truy cập, theo dõi KPI bán hàng & lập bảng lương tháng (TK 334 / 6421)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportCSV}
            title="Xuất file Excel CSV danh sách nhân viên"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-[#a93054] text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel / CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingEmployee(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#fb6f92] to-[#a93054] hover:opacity-95 text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Thêm Nhân Viên Mới</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng Số Nhân Sự</span>
            <div className="p-2 bg-pink-50 text-[#a93054] rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalEmployees}</div>
          <p className="text-[11px] text-slate-400 mt-1">Toàn chuỗi Showroom & Kho</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đang Làm Việc</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{activeEmployees}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {Math.round((activeEmployees / (totalEmployees || 1)) * 100)}% quân số hoạt động
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Thu Ngân & Stylist POS</span>
            <div className="p-2 bg-pink-50 text-[#fb6f92] rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#a93054] mt-2">{salesPosEmployees}</div>
          <p className="text-[11px] text-slate-400 mt-1">Trực tiếp tại quầy & showroom</p>
        </div>

        <div className="bg-gradient-to-br from-[#ffe5ec] to-[#fce4ec] rounded-2xl p-4 border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#a93054]">Quỹ Lương Tháng T8/2026</span>
            <div className="p-2 bg-white/80 text-[#a93054] rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-[#a93054] mt-2">
            {(totalEstimatedPayroll).toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[10px] text-slate-600 mt-1 font-medium">Lương cứng + Phụ cấp cơ bản</p>
        </div>

      </div>

      {/* Main View Mode Tabs (Danh Sách / Bảng Lương) */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-xs overflow-hidden">
        
        <div className="px-6 pt-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'border-[#a93054] text-[#a93054]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Danh Sách Nhân Sự ({filteredEmployees.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'payroll'
                  ? 'border-[#a93054] text-[#a93054]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bảng Lương & Hoa Hồng Bán Hàng (TK 334)</span>
            </button>
          </div>

          {/* Quick Search & Filters */}
          <div className="flex items-center flex-wrap gap-2 pb-3">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, mã NV, SĐT, vị trí..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92] text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Tất cả phòng ban</option>
              <option value="SALES_POS">🛍️ Showroom & Thu Ngân POS</option>
              <option value="ACCOUNTING">📊 Kế Toán - Tài Chính</option>
              <option value="WAREHOUSE">📦 Kho Vận & Thủ Quỹ</option>
              <option value="MANAGEMENT">👔 Ban Giám Đốc</option>
              <option value="MARKETING_DESIGN">🎨 Thiết Kế Lookbook</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fb6f92] text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">🟢 Đang làm việc</option>
              <option value="ON_LEAVE">🟡 Tạm nghỉ</option>
              <option value="RESIGNED">🔴 Đã thôi việc</option>
            </select>
          </div>

        </div>

        {/* TAB 1: DANH SÁCH NHÂN VIÊN */}
        {activeTab === 'list' && (
          <div className="overflow-x-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-pink-200" />
                <p className="text-sm font-semibold text-slate-600">Không tìm thấy nhân viên nào phù hợp</p>
                <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                    <th className="py-3 px-4">Nhân Viên & Mã</th>
                    <th className="py-3 px-4">Phòng Ban & Vị Trí</th>
                    <th className="py-3 px-4">Liên Hệ (SĐT / Email)</th>
                    <th className="py-3 px-4">Lương Cơ Bản</th>
                    <th className="py-3 px-4">Quyền Hệ Thống</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(employee => {
                    const deptInfo = getDepartmentInfo(employee.department);
                    const roleBadge = getRoleBadge(employee.role);
                    return (
                      <tr 
                        key={employee.id}
                        className="hover:bg-rose-50/40 transition group cursor-pointer"
                        onClick={() => setDetailEmployee(employee)}
                      >
                        {/* Avatar & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-pink-100 text-slate-800 flex items-center justify-center text-lg shrink-0 shadow-2xs border border-pink-200">
                              {employee.avatar || '👤'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{employee.name}</span>
                                <span className="font-mono text-[10px] text-[#a93054] bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">
                                  {employee.code}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {employee.gender === 'FEMALE' ? 'Nữ' : 'Nam'} • {employee.branch.split(',')[0]}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Dept & Position */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{employee.position}</div>
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5 ${deptInfo.color}`}>
                            {deptInfo.label}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{employee.phone}</span>
                          </div>
                          {employee.email && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{employee.email}</span>
                            </div>
                          )}
                        </td>

                        {/* Salary */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">
                            {(employee.baseSalary).toLocaleString('vi-VN')} đ
                          </div>
                          {employee.commissionRate > 0 && (
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              +{employee.commissionRate}% Hoa hồng
                            </span>
                          )}
                        </td>

                        {/* System Role */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.8 rounded-lg border ${roleBadge.class}`}>
                            {roleBadge.label}
                          </span>
                          {employee.username && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              @{employee.username}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            employee.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : employee.status === 'ON_LEAVE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              employee.status === 'ACTIVE' ? 'bg-emerald-500' : employee.status === 'ON_LEAVE' ? 'bg-amber-500' : 'bg-slate-400'
                            }`} />
                            <span>{employee.status === 'ACTIVE' ? 'Đang làm' : employee.status === 'ON_LEAVE' ? 'Tạm nghỉ' : 'Đã nghỉ'}</span>
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailEmployee(employee)}
                              title="Xem chi tiết hồ sơ & tính lương"
                              className="p-1.5 text-slate-500 hover:text-[#a93054] hover:bg-pink-100/70 rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingEmployee(employee);
                                setIsModalOpen(true);
                              }}
                              title="Sửa thông tin nhân viên"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc chắn muốn xóa nhân sự ${employee.name} (${employee.code})?`)) {
                                  onDeleteEmployee(employee.id);
                                }
                              }}
                              title="Xóa nhân viên"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: BẢNG LƯƠNG & HOA HỒNG THÁNG */}
        {activeTab === 'payroll' && (
          <div className="p-6 space-y-4">
            
            {/* Header info banner */}
            <div className="bg-gradient-to-r from-[#ffe5ec] to-pink-50 p-4 rounded-2xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-[#fb6f92] to-[#a93054] text-white rounded-xl shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Bảng Quyết Toán Tiền Lương & Hoa Hồng Bán Lẻ (Tháng 8/2026)
                  </h4>
                  <p className="text-xs text-[#a93054]">
                    Tài khoản Kế toán TT133 & TT200: TK 334 (Phải trả NLĐ) • TK 6421 / 6411 (Chi phí nhân viên bán hàng)
                  </p>
                </div>
              </div>

              {onOpenCashPayment && (
                <button
                  onClick={() => onOpenCashPayment(totalEstimatedPayroll, 'Chi trả lương & phụ cấp nhân sự tháng 8/2026', 'Toàn thể Cán bộ Nhân viên D&D')}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-bold text-xs shadow-xs hover:opacity-95 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>+ Lập Phiếu Chi Lương Toàn Bộ</span>
                </button>
              )}
            </div>

            {/* Payroll Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3">Mã NV</th>
                    <th className="py-3 px-3">Họ Và Tên</th>
                    <th className="py-3 px-3">Vị Trí / Phòng Ban</th>
                    <th className="py-3 px-3 text-right">Lương Cơ Bản</th>
                    <th className="py-3 px-3 text-right">Phụ Cấp</th>
                    <th className="py-3 px-3 text-right">% Hoa Hồng</th>
                    <th className="py-3 px-3 text-right">Tạm Tính Hoa Hồng</th>
                    <th className="py-3 px-3 text-right text-[#a93054]">Tổng Thực Lĩnh</th>
                    <th className="py-3 px-3">Tài Khoản Nhận Lương</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {employees.filter(e => e.status === 'ACTIVE').map(emp => {
                    const estSales = emp.department === 'SALES_POS' ? 68500000 : 0;
                    const commission = Math.round((estSales * (emp.commissionRate || 0)) / 100);
                    const netIncome = emp.baseSalary + (emp.allowance || 0) + commission;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-[#a93054]">{emp.code}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          <span className="mr-1.5">{emp.avatar}</span>
                          <span>{emp.name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{emp.position}</td>
                        <td className="py-3 px-3 text-right font-semibold">{(emp.baseSalary).toLocaleString('vi-VN')} đ</td>
                        <td className="py-3 px-3 text-right text-slate-600">{(emp.allowance || 0).toLocaleString('vi-VN')} đ</td>
                        <td className="py-3 px-3 text-right text-slate-600">{emp.commissionRate}%</td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-semibold">+{commission.toLocaleString('vi-VN')} đ</td>
                        <td className="py-3 px-3 text-right font-extrabold text-[#a93054] bg-rose-50/50">
                          {netIncome.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600 font-mono">
                          {emp.bankAccount ? `${emp.bankAccount} (${emp.bankName})` : 'Tiền mặt tại quỹ'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-rose-50/90 font-extrabold text-slate-900 border-t-2 border-rose-200">
                    <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                      Tổng Cộng Quỹ Lương:
                    </td>
                    <td className="py-3 px-3 text-right">
                      {totalBaseSalary.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-3 text-right">
                      {totalAllowance.toLocaleString('vi-VN')} đ
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-right text-emerald-800">
                      Hoa hồng tự động
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-[#a93054]">
                      {totalEstimatedPayroll.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        )}

      </div>

      {/* Add / Edit Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          if ('id' in data) {
            onUpdateEmployee(data as Employee);
          } else {
            onAddEmployee(data);
          }
        }}
        initialEmployee={editingEmployee}
        existingCodes={employees.map(e => e.code)}
      />

      {/* Employee Details Modal */}
      <EmployeeDetailModal
        employee={detailEmployee}
        isOpen={!!detailEmployee}
        onClose={() => setDetailEmployee(null)}
        onEdit={(emp) => {
          setEditingEmployee(emp);
          setIsModalOpen(true);
        }}
        onDelete={onDeleteEmployee}
        invoices={invoices}
      />

    </div>
  );
};

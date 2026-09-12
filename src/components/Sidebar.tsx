import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ReceiptText, 
  Users, 
  Package, 
  BookOpenCheck, 
  ListTree, 
  PieChart, 
  ShoppingBag, 
  Truck, 
  Building2, 
  Tag, 
  CreditCard, 
  Lock, 
  Store, 
  LogOut, 
  UserCheck, 
  ClipboardCheck, 
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  LockKeyhole
} from 'lucide-react';
import { AuthUser, UserRole } from '../types/accounting';
import { isTabAllowedForRole, ROLE_CONFIGS } from '../utils/rbac';

export type TabKey = 
  | 'pos'
  | 'login'
  | 'auth'
  | 'dashboard'
  | 'employees'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'categories'
  | 'sales'
  | 'purchases'
  | 'requisitions'
  | 'crm'
  | 'inventory'
  | 'cashbook'
  | 'debts'
  | 'reports'
  | 'journal'
  | 'accounts';

interface SidebarNavItem {
  id: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: number;
  badgeColor?: string;
}

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  unpaidInvoiceCount: number;
  lowStockCount: number;
  pendingRequisitionsCount?: number;
  careRemindersCount?: number;
  employeeCount?: number;
  customerCount?: number;
  supplierCount?: number;
  productCount?: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unpaidInvoiceCount,
  lowStockCount,
  pendingRequisitionsCount = 0,
  careRemindersCount = 0,
  employeeCount,
  customerCount,
  supplierCount,
  productCount,
  currentUser,
  onLogout
}) => {
  const currentRole = currentUser?.role || 'DIRECTOR';
  const roleConfig = ROLE_CONFIGS[currentRole] || ROLE_CONFIGS.STAFF;

  // Master definition of all sections
  const allSections: SidebarSection[] = [
    {
      title: 'Trạm Bán Hàng POS & CSKH',
      items: [
        { id: 'pos' as TabKey, label: '⚡ Trạm Thu Ngân POS Quầy', icon: Store, highlight: true },
        { id: 'crm' as TabKey, label: '👗 Tư Vấn Vóc Dáng & CSKH VIP', icon: HeartHandshake, badge: careRemindersCount > 0 ? careRemindersCount : undefined, badgeColor: 'bg-rose-500' },
        { id: 'sales' as TabKey, label: '📑 Hóa Đơn & Đơn Bán Hàng', icon: ShoppingBag },
        { id: 'customers' as TabKey, label: '👥 Danh Bạ Khách Hàng VIP', icon: Users, badge: customerCount },
      ]
    },
    {
      title: 'Mua Hàng, Xưởng May & Đề Xuất',
      items: [
        { id: 'requisitions' as TabKey, label: '📋 Đề Xuất & Duyệt Nhập/Xuất', icon: ClipboardCheck, badge: pendingRequisitionsCount > 0 ? pendingRequisitionsCount : undefined, badgeColor: 'bg-amber-500' },
        { id: 'purchases' as TabKey, label: '🏭 Nhập Hàng Từ Xưởng May', icon: Truck, badge: unpaidInvoiceCount > 0 ? unpaidInvoiceCount : undefined, badgeColor: 'bg-rose-600' },
        { id: 'suppliers' as TabKey, label: '🏢 Danh Bạ Xưởng & Nhà Cung Cấp', icon: Building2, badge: supplierCount },
      ]
    },
    {
      title: 'Quản Lý Kho Hàng & Mẫu Mã',
      items: [
        { id: 'inventory' as TabKey, label: '📦 Kho Hàng & Phiếu Nhập Xuất', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-rose-500' },
        { id: 'products' as TabKey, label: '🏷️ Danh Mục Mẫu Mã & Tồn Kho', icon: Tag, badge: productCount },
        { id: 'categories' as TabKey, label: '📂 Nhóm Hàng & Danh Mục', icon: ListTree },
      ]
    },
    {
      title: 'Tài Chính & Kế Toán Doanh Nghiệp',
      items: [
        { id: 'cashbook' as TabKey, label: '💰 Sổ Quỹ Tiền Mặt & Ngân Hàng', icon: Wallet },
        { id: 'debts' as TabKey, label: '💳 Quản Lý Công Nợ Phải Thu/Trả', icon: CreditCard },
        { id: 'reports' as TabKey, label: '📊 Báo Cáo Tài Chính & Thuế', icon: PieChart },
        { id: 'journal' as TabKey, label: '📖 Nhật Ký Chung (Sổ Cái VAS)', icon: BookOpenCheck },
        { id: 'accounts' as TabKey, label: '🌳 Hệ Thống TK (TT 133/200)', icon: ListTree },
      ]
    },
    {
      title: 'Hệ Thống & Quản Trị Cửa Hàng',
      items: [
        { id: 'dashboard' as TabKey, label: '📈 Tổng Quan Điều Hành ERP', icon: LayoutDashboard },
        { id: 'employees' as TabKey, label: '👔 Quản Lý Nhân Sự & Bảng Lương', icon: UserCheck, badge: employeeCount, badgeColor: 'bg-indigo-600' },
        { id: 'login' as TabKey, label: '🛡️ Cổng Đăng Nhập & Phân Quyền', icon: Lock },
      ]
    }
  ];

  // Filter sections and items strictly based on the logged-in user's role
  const visibleSections = allSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isTabAllowedForRole(currentRole, item.id))
    }))
    .filter(section => section.items.length > 0);

  return (
    <aside id="app-sidebar" className="hidden md:flex md:w-64 bg-white border border-slate-200 p-3 rounded-2xl shrink-0 flex-col justify-between overflow-y-auto shadow-xs max-h-[calc(100vh-80px)] sticky top-16">
      <div className="flex flex-col gap-4 w-full">
        
        {/* Current Active Internal Role Banner in Sidebar */}
        {currentUser && (
          <div className="hidden md:block bg-slate-900 text-white p-3 rounded-xl shadow-xs space-y-1.5 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-400">
                VAI TRÒ ĐANG TRỰC:
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl p-1 bg-slate-800 rounded-lg">{currentUser.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs truncate text-white">{currentUser.name}</div>
                <div className="text-[10px] text-pink-300 font-semibold truncate">{currentUser.roleTitle.split('(')[0]}</div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800 truncate">
              📍 {currentUser.branch}
            </div>
            <div className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 text-center font-medium">
              Cho phép: <strong>{roleConfig.allowedTabs.filter(t => t !== 'login' && t !== 'auth').length}</strong> phân hệ
            </div>
          </div>
        )}

        {visibleSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-2 py-0.5 flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                {section.title}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || (item.id === 'login' && activeTab === 'auth');
                return (
                  <button
                    key={item.id}
                    id={`tab-btn-${item.id}`}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : item.highlight
                        ? 'bg-rose-50/80 text-[#a93054] hover:bg-rose-100/80 font-bold border border-rose-200/60'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-pink-400' : item.highlight ? 'text-[#a93054]' : 'text-slate-500'}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className={`text-[10px] font-bold text-white px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-rose-600'}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      </div>

      {/* Internal Workstation Diagnostics Footer */}
      <div className="mt-auto pt-3 border-t border-slate-200 hidden md:block px-1 text-[11px]">
        <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
            <span>🛡️ PHÂN QUYỀN NỘI BỘ</span>
            <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">BẢO MẬT</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Chỉ hiển thị các phân hệ và dữ liệu được phân công.
          </p>
        </div>
      </div>
    </aside>
  );
};

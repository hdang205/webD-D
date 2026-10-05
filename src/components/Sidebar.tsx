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

  // Cấu trúc phân nhóm tinh gọn theo chuẩn ERP Thời Trang D&D (Phase 8.1)
  const allSections: SidebarSection[] = [
    {
      title: 'DASHBOARD',
      items: [
        { id: 'dashboard' as TabKey, label: 'Tổng Quan ERP', icon: LayoutDashboard },
      ]
    },
    {
      title: 'QUẢN LÝ',
      items: [
        { id: 'products' as TabKey, label: 'Sản Phẩm', icon: Tag, badge: productCount },
        { id: 'categories' as TabKey, label: 'Danh Mục Hàng', icon: ListTree },
        { id: 'customers' as TabKey, label: 'Khách Hàng', icon: Users, badge: customerCount },
        { id: 'suppliers' as TabKey, label: 'Nhà Cung Cấp', icon: Building2, badge: supplierCount },
        { id: 'employees' as TabKey, label: 'Người Dùng (Nhân Sự)', icon: UserCheck, badge: employeeCount, badgeColor: 'bg-indigo-600' },
      ]
    },
    {
      title: 'GIAO DỊCH',
      items: [
        { id: 'sales' as TabKey, label: 'Bán Hàng (Hóa Đơn)', icon: ShoppingBag },
        { id: 'pos' as TabKey, label: 'Bán Hàng POS Quầy', icon: Store, highlight: true },
        { id: 'purchases' as TabKey, label: 'Nhập Hàng Xưởng', icon: Truck, badge: unpaidInvoiceCount > 0 ? unpaidInvoiceCount : undefined, badgeColor: 'bg-rose-600' },
        { id: 'requisitions' as TabKey, label: 'Đề Xuất Nhập/Xuất', icon: ClipboardCheck, badge: pendingRequisitionsCount > 0 ? pendingRequisitionsCount : undefined, badgeColor: 'bg-amber-500' },
      ]
    },
    {
      title: 'KHO',
      items: [
        { id: 'inventory' as TabKey, label: 'Tồn Kho & Xuất Nhập', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-rose-500' },
      ]
    },
    {
      title: 'KẾ TOÁN',
      items: [
        { id: 'cashbook' as TabKey, label: 'Thu Chi (Sổ Quỹ)', icon: Wallet },
        { id: 'debts' as TabKey, label: 'Quản Lý Công Nợ', icon: CreditCard },
        { id: 'reports' as TabKey, label: 'Báo Cáo Tài Chính', icon: PieChart },
      ]
    }
  ];

  // Lọc quyền hiển thị nghiêm ngặt theo RBAC của người dùng đăng nhập
  const visibleSections = allSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isTabAllowedForRole(currentRole, item.id))
    }))
    .filter(section => section.items.length > 0);

  return (
    <aside id="app-sidebar" className="hidden md:flex md:w-64 bg-white border border-slate-200 p-3 rounded-2xl shrink-0 flex-col justify-between overflow-y-auto shadow-xs max-h-[calc(100vh-80px)] sticky top-16">
      <div className="flex flex-col gap-4 w-full">

        {/* Brand Header with Logo */}
        <div className="flex items-center gap-3 px-2 py-1.5 border-b border-slate-100 pb-3">
          <img src="/logo.png" alt="D&D Fashion Logo" className="w-10 h-10 object-contain rounded-xl border border-rose-100 shadow-2xs bg-white p-0.5" />
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-sm text-slate-900 tracking-tight truncate">D&D FASHION</h2>
            <p className="text-[10px] text-slate-400 font-medium">Quản trị Thời trang ERP</p>
          </div>
        </div>

        {visibleSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-2 py-0.5 flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                {section.title}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`tab-btn-${item.id}`}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${isActive
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

      {/* Footer bảo mật & bản quyền */}
      <div className="mt-auto pt-3 border-t border-slate-200 hidden md:block px-1 text-[11px]">
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
          <p className="text-[10px] font-bold text-slate-700">D&D FASHION ERP</p>
        </div>
      </div>
    </aside>
  );
};

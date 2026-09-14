import React from 'react';
import { 
  X, 
  Store, 
  ShoppingBag, 
  ClipboardCheck, 
  Package, 
  Users, 
  Building2, 
  Wallet, 
  CreditCard, 
  PieChart, 
  BookOpenCheck, 
  ListTree, 
  LayoutDashboard, 
  UserCheck, 
  Lock, 
  HeartHandshake, 
  Tag, 
  Sparkles, 
  Settings, 
  Download, 
  LogOut, 
  ShieldCheck, 
  RotateCcw,
  CheckCircle2,
  Phone,
  ChevronRight,
  Smartphone
} from 'lucide-react';
import { TabKey } from '../Sidebar';
import { AuthUser } from '../../types/accounting';
import { isTabAllowedForRole, ROLE_CONFIGS } from '../../utils/rbac';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onFastSwitchUser?: (username: string) => void;
  onOpenAIAssistant: () => void;
  onOpenSettings: () => void;
  onExportBackup: () => void;
  onLockScreen?: () => void;
  unpaidInvoiceCount: number;
  lowStockCount: number;
  pendingRequisitionsCount: number;
  careRemindersCount: number;
  employeeCount?: number;
  customerCount?: number;
  supplierCount?: number;
  productCount?: number;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  onFastSwitchUser,
  onOpenAIAssistant,
  onOpenSettings,
  onExportBackup,
  onLockScreen,
  unpaidInvoiceCount,
  lowStockCount,
  pendingRequisitionsCount,
  careRemindersCount,
  employeeCount,
  customerCount,
  supplierCount,
  productCount
}) => {
  if (!isOpen) return null;

  const currentRole = currentUser?.role || 'DIRECTOR';
  const roleConfig = ROLE_CONFIGS[currentRole] || ROLE_CONFIGS.STAFF;

  const handleNavigate = (tab: TabKey) => {
    onSelectTab(tab);
    onClose();
  };

  const sections = [
    {
      title: 'DASHBOARD',
      items: [
        { id: 'dashboard' as TabKey, label: 'Tổng Quan ERP', icon: LayoutDashboard, badge: undefined, color: 'text-purple-400' },
      ]
    },
    {
      title: 'QUẢN LÝ',
      items: [
        { id: 'products' as TabKey, label: 'Sản Phẩm', icon: Tag, badge: productCount, color: 'text-rose-400' },
        { id: 'categories' as TabKey, label: 'Danh Mục Hàng', icon: ListTree, badge: undefined, color: 'text-purple-400' },
        { id: 'customers' as TabKey, label: 'Khách Hàng VIP', icon: Users, badge: customerCount, color: 'text-blue-400' },
        { id: 'suppliers' as TabKey, label: 'Nhà Cung Cấp / Xưởng', icon: Building2, badge: supplierCount, color: 'text-cyan-400' },
        { id: 'employees' as TabKey, label: 'Người Dùng (Nhân Sự)', icon: UserCheck, badge: employeeCount, color: 'text-emerald-400' },
      ]
    },
    {
      title: 'GIAO DỊCH',
      items: [
        { id: 'sales' as TabKey, label: 'Bán Hàng (Hóa Đơn)', icon: ShoppingBag, badge: undefined, color: 'text-indigo-400' },
        { id: 'pos' as TabKey, label: 'Bán Hàng POS Quầy', icon: Store, badge: undefined, color: 'text-pink-400' },
        { id: 'purchases' as TabKey, label: 'Nhập Hàng Xưởng', icon: ShoppingBag, badge: unpaidInvoiceCount, color: 'text-emerald-400' },
        { id: 'requisitions' as TabKey, label: 'Đề Xuất Nhập/Xuất', icon: ClipboardCheck, badge: pendingRequisitionsCount, color: 'text-amber-400' },
      ]
    },
    {
      title: 'KHO',
      items: [
        { id: 'inventory' as TabKey, label: 'Tồn Kho & Phiếu Kho', icon: Package, badge: lowStockCount, color: 'text-amber-400' },
      ]
    },
    {
      title: 'KẾ TOÁN',
      items: [
        { id: 'cashbook' as TabKey, label: 'Thu Chi (Sổ Quỹ)', icon: Wallet, badge: undefined, color: 'text-emerald-400' },
        { id: 'debts' as TabKey, label: 'Quản Lý Công Nợ', icon: CreditCard, badge: undefined, color: 'text-rose-400' },
        { id: 'reports' as TabKey, label: 'Báo Cáo Tài Chính', icon: PieChart, badge: undefined, color: 'text-indigo-400' },
      ]
    }
  ];

  const visibleSections = sections
    .map(sec => ({
      ...sec,
      items: sec.items.filter(item => isTabAllowedForRole(currentRole, item.id))
    }))
    .filter(sec => sec.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm bg-slate-900 text-white h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-slate-800">
        
        {/* Drawer Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#fb6f92] to-[#a93054] flex items-center justify-center text-white font-bold shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">D&D Mobile Workstation</h3>
              <p className="text-[10px] text-pink-300">Toàn bộ phân hệ quản trị thời trang</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="p-4 bg-slate-800/60 border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold tracking-wider text-pink-400 uppercase">
                Tài khoản đang trực:
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-2xl p-1.5 bg-slate-900 rounded-xl border border-slate-700">
                {currentUser.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-white truncate">{currentUser.name}</div>
                <div className="text-xs text-pink-300 font-medium truncate">{currentUser.roleTitle}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">📍 {currentUser.branch}</div>
              </div>
            </div>

            {/* Chuyển đổi tài khoản / Đăng nhập lại */}
            <div className="mt-3 pt-2.5 border-t border-slate-700/60">
              <button
                onClick={() => {
                  onSelectTab('login');
                  onClose();
                }}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                <span>Đổi Tài Khoản Làm Việc</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {visibleSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
                {sec.title}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white shadow-md'
                          : 'bg-slate-800/40 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.badge && item.badge > 0 ? (
                          <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        ) : null}
                        <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Utility Tools & Logout */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                onOpenAIAssistant();
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-pink-300 border border-slate-700/80 transition text-[10px] font-bold"
            >
              <Sparkles className="w-4 h-4 mb-0.5 text-pink-400" />
              <span>Trợ Lý AI</span>
            </button>

            <button
              onClick={() => {
                onExportBackup();
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition text-[10px] font-bold"
            >
              <Download className="w-4 h-4 mb-0.5 text-slate-400" />
              <span>Sao Lưu</span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition text-[10px] font-bold"
            >
              <Settings className="w-4 h-4 mb-0.5 text-slate-400" />
              <span>Cài Đặt</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onLockScreen && (
              <button
                onClick={() => {
                  onLockScreen();
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa Màn Hình</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-semibold border border-rose-800/80 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng Xuất</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
